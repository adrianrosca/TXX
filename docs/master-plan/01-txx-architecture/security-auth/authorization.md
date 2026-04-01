# Authorization

## Policy-Based Authorization

TXX uses Microsoft's `IAuthorizationService` with named policies. All authorization decisions in the application go through a policy — never through raw role checks scattered in code.

### Policies (Txx.Core/Security/Policies.cs)

```csharp
public static class Policies
{
    // Mission management
    public const string ViewMissions        = "txx.missions.view";
    public const string CreateMission       = "txx.missions.create";
    public const string ArchiveMission      = "txx.missions.archive";

    // Personnel
    public const string ViewPersonnel       = "txx.personnel.view";
    public const string ManagePersonnel     = "txx.personnel.manage";

    // Map
    public const string ViewMap             = "txx.map.view";
    public const string ViewClassifiedMap   = "txx.map.classified.view";    // R-only

    // Admin
    public const string AdminAccess         = "txx.admin";

    // R-level classified
    public const string ViewClassifiedIntel = "txx.intel.classified.view";  // R-only
}
```

Policies are just string constants — the actual logic of who satisfies a policy is in the handlers.

### Policy Handlers (Txx.Core/Security/)

```csharp
// Example: ViewClassifiedMap requires R-level user with specific role
public class ViewClassifiedMapHandler
    : AuthorizationHandler<PolicyRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx, PolicyRequirement req)
    {
        var user = ctx.User;

        if (user.IsInRole(Roles.R.ClassifiedViewer) ||
            user.IsInRole(Roles.R.Operator))
            ctx.Succeed(req);

        return Task.CompletedTask;
    }
}
```

Policy handlers are registered in `AddCoreServices()` and run automatically when `IAuthorizationService.AuthorizeAsync` is called.

---

## Authorization in the MediatR Pipeline

The `AuthorizationBehavior` (defined in the Strong Core) checks policies before any command or query handler executes:

```csharp
// Commands and queries declare required policies via attribute:
[RequirePolicy(Policies.CreateMission)]
public record CreateMission.Command(string Name, DateTime StartDate) : IRequest<CreateMission.Result>;

// The pipeline behavior:
public class AuthorizationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
{
    private readonly ICurrentUser _user;
    private readonly IAuthorizationService _authService;

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var policy = typeof(TRequest).GetCustomAttribute<RequirePolicyAttribute>()?.Policy;

        if (policy is not null)
        {
            var result = await _authService.AuthorizeAsync(
                _user.ToClaimsPrincipal(), null, policy);

            if (!result.Succeeded)
                throw new UnauthorizedException(
                    $"User '{_user.UserName}' is not authorized for policy '{policy}'.");
        }

        return await next();
    }
}
```

This means: if a command requires a policy, it is enforced before the handler sees the request. There is no way to accidentally call a protected command without the policy check running.

---

## Authorization in ViewModels

ViewModels use `IAuthorizationService` to determine what controls to show/enable:

```csharp
public partial class MissionDetailViewModel : TxxViewModelBase
{
    [ObservableProperty] private bool _canArchive;

    public override async void OnNavigatedTo(NavigationContext ctx)
    {
        var authResult = await _authService.AuthorizeAsync(
            _currentUser.ToClaimsPrincipal(), Policies.ArchiveMission);

        CanArchive = authResult.Succeeded;
    }
}
```

```xaml
<!-- Button disabled (and hidden) when user lacks ArchiveMission policy -->
<Button Content="Archive"
        Command="{Binding ArchiveCommand}"
        Visibility="{Binding CanArchive, Converter={StaticResource BoolToVisibilityConverter}}" />
```

This is a **defense-in-depth** measure. The pipeline behavior already prevents unauthorized command execution. The ViewModel check is purely for UX — don't show buttons the user can't use.

---

## Command Guards

For commands that need to be disabled (not just hidden), `ITxxCommandGuard` wraps `IAsyncRelayCommand` and integrates policy checking into `CanExecute`:

```csharp
public interface ITxxCommandGuard
{
    IAsyncRelayCommand Wrap(IAsyncRelayCommand command, string policy);
}

public class TxxCommandGuard : ITxxCommandGuard
{
    private readonly ICurrentUser _user;
    private readonly IAuthorizationService _auth;

    public IAsyncRelayCommand Wrap(IAsyncRelayCommand inner, string policy)
        => new PolicyGuardedCommand(inner, policy, _user, _auth);
}
```

`PolicyGuardedCommand.CanExecute()` checks the policy synchronously (cached after first check). This keeps WPF command binding working correctly — buttons automatically disable when the user lacks authorization.

---

## Role Definitions

Roles are defined per level. Higher levels include lower-level roles (a Y operator also has the rights of a G operator on G-defined features).

### G Level (test roles — no real permissions enforced)
| Role | Description |
|------|-------------|
| `Mock.Admin` | Full access — all features, all policies |
| `Mock.Operator` | Operational access — create/manage missions |
| `Mock.Analyst` | Read + analyze — view all, no writes |
| `Mock.Viewer` | Read-only — view missions and map |

### Y Level
| Role | Description |
|------|-------------|
| `Y.Admin` | Full Y-level administrative access |
| `Y.Operator` | Full operational access |
| `Y.Analyst` | Analytical access, read-heavy |
| `Y.Viewer` | Read-only |

### R Level
| Role | Description |
|------|-------------|
| `R.Admin` | Full R-level administrative access |
| `R.Operator` | Full operational access including classified |
| `R.Classified.Viewer` | Read access to classified features |
| `R.Analyst` | Analytical access including classified data |

Role constants are defined in a `Roles` static class mirroring the `Policies` class — no magic strings in handlers or ViewModels.

---

## Audit Trail for Authorization Failures

Every `UnauthorizedException` thrown by `AuthorizationBehavior` is caught by `LoggingBehavior` and written to the audit log with:
- Timestamp
- User ID and user name
- Command/query name
- Policy that was denied
- Restriction level

At Y and R, authorization failures are written to a tamper-evident audit log (see [Security Per Level](security-per-level.md)).
