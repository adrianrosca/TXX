# Authentication

## ICurrentUser (Txx.Core)

The single abstraction that all application code uses to identify the acting user:

```csharp
public interface ICurrentUser
{
    Guid UserId { get; }
    string UserName { get; }
    string DisplayName { get; }
    string? Email { get; }
    IReadOnlyList<string> Roles { get; }
    RestrictionLevel Level { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(string role);
    bool HasClaim(string type, string value);
}

public enum RestrictionLevel { G = 0, Y = 1, R = 2 }
```

`ICurrentUser` is registered as `Scoped` — one instance per request/operation. In WPF (no request pipeline), scope is defined by the DI container's lifetime scope, which is typically the lifetime of a ViewModel navigation session.

---

## IAuthenticationService (Txx.Core)

```csharp
public interface IAuthenticationService
{
    Task<AuthResult> LoginAsync(LoginCredentials credentials, CancellationToken ct = default);
    Task LogoutAsync(CancellationToken ct = default);
    Task<AuthResult> RefreshAsync(CancellationToken ct = default);
    bool IsAuthenticated { get; }
    event EventHandler<SessionExpiredEventArgs> SessionExpired;
}

public record LoginCredentials(string UserName, string Password);
public record AuthResult(bool Success, string? ErrorMessage, ICurrentUser? User);
```

The application calls `IAuthenticationService.LoginAsync` on startup (or when session expires). The resulting `ICurrentUser` is stored in the DI-managed `ICurrentUserStore` and injected into consumers.

---

## G Level: MockAuthenticationService

At G level, authentication is a no-op. The mock service supports switching between predefined test identities for development and UI testing:

```csharp
public class MockAuthenticationService : IAuthenticationService
{
    public static readonly Dictionary<string, MockUser> TestUsers = new()
    {
        ["admin"]    = new("admin", "Admin User", [Roles.Admin, Roles.Operator]),
        ["operator"] = new("operator", "Operator Jones", [Roles.Operator]),
        ["viewer"]   = new("viewer", "Viewer Smith", [Roles.Viewer]),
        ["analyst"]  = new("analyst", "Analyst Brown", [Roles.Analyst]),
    };

    public Task<AuthResult> LoginAsync(LoginCredentials creds, CancellationToken ct)
    {
        if (TestUsers.TryGetValue(creds.UserName.ToLower(), out var user))
            return Task.FromResult(new AuthResult(true, null, new MockCurrentUser(user)));

        return Task.FromResult(new AuthResult(false, "Unknown test user", null));
    }

    public bool IsAuthenticated => true;       // Always authenticated at G
}
```

The G-level login screen lets developers pick any test identity from a dropdown. This allows testing every role's view of the application without a real identity provider.

---

## Y Level: Active Directory / OIDC

The Y implementation authenticates against the organization's Active Directory via OpenID Connect (or Windows Integrated Authentication where OIDC is not available):

```csharp
// Txx.Infrastructure.Y
public class OidcAuthenticationService : IAuthenticationService
{
    private readonly OidcClient _oidcClient;
    private readonly ICurrentUserStore _userStore;
    private LoginResult? _loginResult;

    public async Task<AuthResult> LoginAsync(LoginCredentials creds, CancellationToken ct)
    {
        // For OIDC: redirect to IdP — credentials are handled by the IdP, not TXX
        _loginResult = await _oidcClient.LoginAsync(new LoginRequest(), ct);

        if (_loginResult.IsError)
            return new AuthResult(false, _loginResult.Error, null);

        var user = AdCurrentUser.FromLoginResult(_loginResult);
        _userStore.SetCurrentUser(user);
        return new AuthResult(true, null, user);
    }

    public async Task<AuthResult> RefreshAsync(CancellationToken ct)
    {
        var refresh = await _oidcClient.RefreshTokenAsync(_loginResult!.RefreshToken, ct);
        // update token, keep user
    }
}
```

Token storage: access and refresh tokens are held in memory only — never written to disk, registry, or `IsolatedStorage`.

Session expiry: a background timer checks token expiry. 5 minutes before expiry, a silent refresh is attempted. If it fails, `SessionExpired` event fires and the UI shows a re-authentication prompt.

---

## R Level: Windows Integrated Authentication

At R (air-gapped, domain-joined machines), the user is already authenticated via Windows login. No separate login screen is needed:

```csharp
// Txx.Infrastructure.R
public class WindowsAuthenticationService : IAuthenticationService
{
    private readonly ICurrentUserStore _userStore;

    public WindowsAuthenticationService(ICurrentUserStore store)
    {
        // On construction: read the current Windows identity and set ICurrentUser
        var identity = WindowsIdentity.GetCurrent();
        var user = WindowsCurrentUser.FromIdentity(identity);
        store.SetCurrentUser(user);
    }

    public Task<AuthResult> LoginAsync(LoginCredentials creds, CancellationToken ct)
    {
        // Already authenticated via Windows — no-op
        return Task.FromResult(new AuthResult(true, null, _userStore.CurrentUser));
    }

    public bool IsAuthenticated => WindowsIdentity.GetCurrent().IsAuthenticated;
}
```

Roles are derived from Active Directory group membership on the R-network domain controller. The `WindowsCurrentUser` maps AD groups to TXX role names (`R.Operator`, `R.Classified.Viewer`, etc.).

---

## ICurrentUserStore

A scoped store that holds the active `ICurrentUser` instance and allows it to be updated after login:

```csharp
public interface ICurrentUserStore
{
    ICurrentUser CurrentUser { get; }
    void SetCurrentUser(ICurrentUser user);
    event EventHandler<UserChangedEventArgs> UserChanged;
}
```

Consumers inject `ICurrentUser` directly (not `ICurrentUserStore`). The DI container resolves `ICurrentUser` via a factory that returns `ICurrentUserStore.CurrentUser`, ensuring all consumers see the same up-to-date identity after login.

```csharp
// Registration:
services.AddSingleton<ICurrentUserStore, CurrentUserStore>();
services.AddTransient<ICurrentUser>(sp =>
    sp.GetRequiredService<ICurrentUserStore>().CurrentUser);
```
