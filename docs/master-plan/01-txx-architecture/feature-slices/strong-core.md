# Strong Core

The core is not a layer — it is a **toolbox**. Every vertical slice reaches into it for the shared building blocks it needs. The core has no business logic and no feature-specific code.

---

## Txx.Core — Contents

```
Txx.Core/
├── Abstractions/            ← Interfaces that define system-wide contracts
│   ├── IRepository.cs
│   ├── IReadRepository.cs
│   ├── IUnitOfWork.cs
│   ├── ICurrentUser.cs
│   ├── IEventBus.cs
│   ├── INotificationService.cs
│   ├── IMapService.cs
│   └── ISecretsProvider.cs
│
├── BaseTypes/               ← Base classes slices derive from
│   ├── TxxViewModelBase.cs
│   ├── TxxCommandBase.cs
│   ├── EntityBase.cs
│   └── DomainEvent.cs
│
├── CrossCutting/            ← MediatR pipeline behaviors
│   ├── ValidationBehavior.cs
│   ├── LoggingBehavior.cs
│   ├── AuthorizationBehavior.cs
│   └── TransactionBehavior.cs
│
└── Security/
    ├── Policies.cs          ← Policy name constants
    └── ITxxAuthorizationHandler.cs
```

---

## Abstractions

### IRepository\<T\> and IReadRepository\<T\>

```csharp
public interface IRepository<T> where T : EntityBase
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Delete(T entity);
}

public interface IReadRepository<T> where T : EntityBase
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> FindAsync(ISpecification<T> spec, CancellationToken ct = default);
}
```

`IReadRepository<T>` is for query-side handlers — no tracking, no write operations. `IRepository<T>` is for command-side handlers.

### ICurrentUser

```csharp
public interface ICurrentUser
{
    Guid UserId { get; }
    string UserName { get; }
    string DisplayName { get; }
    IReadOnlyList<string> Roles { get; }
    RestrictionLevel Level { get; }
    bool IsInRole(string role);
    bool HasClaim(string type, string value);
}
```

Injected into any ViewModel or handler that needs to know who is acting. Level-specific implementations provide real identity data (see [Security & Auth](../security-auth/authentication.md)).

### IEventBus

```csharp
public interface IEventBus
{
    Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : DomainEvent;
}
```

Thin wrapper over MediatR's `IPublisher`. Every slice raises events through this interface; handlers in other slices subscribe via `INotificationHandler<T>`.

### INotificationService

```csharp
public interface INotificationService
{
    void ShowSuccess(string message);
    void ShowWarning(string message);
    void ShowError(string message);
    Task<bool> ConfirmAsync(string title, string message);
}
```

ViewModels use this instead of directly creating dialogs. G: toast notifications via a simple overlay. Y/R: same, but can be replaced with a level-appropriate notification sink (e.g., system tray alerts at R).

---

## Base Types

### TxxViewModelBase

```csharp
public abstract class TxxViewModelBase : ObservableObject, INotifyDataErrorInfo
{
    // IsBusy / IsLoading state
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private string? _busyMessage;

    // Error state
    [ObservableProperty] private bool _hasError;
    [ObservableProperty] private string? _errorMessage;

    // Validation errors (DataAnnotations + custom)
    private readonly Dictionary<string, List<string>> _errors = new();
    public bool HasErrors => _errors.Any();
    public event EventHandler<DataErrorsChangedEventArgs>? ErrorsChanged;

    // Lifecycle (called by Prism navigation)
    public virtual Task OnNavigatedToAsync(NavigationContext ctx) => Task.CompletedTask;
    public virtual Task OnNavigatedFromAsync(NavigationContext ctx) => Task.CompletedTask;
}
```

All ViewModels in every slice derive from this. It gives them `IsBusy`, `HasError`, and validation support for free. CommunityToolkit.Mvvm source generators handle property boilerplate.

### EntityBase

```csharp
public abstract class EntityBase
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? ModifiedAt { get; private set; }
    public string? CreatedBy { get; private set; }

    private readonly List<DomainEvent> _events = new();
    public IReadOnlyList<DomainEvent> DomainEvents => _events.AsReadOnly();

    protected void RaiseDomainEvent(DomainEvent e) => _events.Add(e);
    public void ClearDomainEvents() => _events.Clear();
}
```

All aggregate roots and entities inherit from this. The audit fields are populated by an EF interceptor in `TxxDbContextBase`. Domain events are collected during the aggregate's lifetime and dispatched after `SaveChanges` succeeds.

### DomainEvent

```csharp
public abstract record DomainEvent : INotification
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}
```

Implements MediatR `INotification` so handlers are discovered automatically. Records are used for immutability.

---

## MediatR Pipeline Behaviors

Behaviors are registered once in `AddCoreServices()` and apply to every command and query automatically. Ordering matters — registration order = execution order.

```csharp
// AddCoreServices() in Txx.Infrastructure:
services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssembly(typeof(TxxCore).Assembly);
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(AuthorizationBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
    cfg.AddBehavior(typeof(IPipelineBehavior<,>), typeof(TransactionBehavior<,>));
});
```

### ValidationBehavior

Runs FluentValidation validators registered in the DI container. If any validator fails, throws `ValidationException` before the handler executes. Slices register their validators via `services.AddValidatorsFromAssembly(...)`.

### AuthorizationBehavior

Commands and queries can declare required policies via `[RequirePolicy("PolicyName")]` attribute. The behavior checks `IAuthorizationService` before executing. If the user lacks the required policy, throws `UnauthorizedException`.

### LoggingBehavior

Structured log entry for every command/query: name, elapsed time, user ID, and (on failure) the exception. Uses Serilog. Does not log request/response bodies to avoid logging sensitive data.

### TransactionBehavior

For commands only (detected by marker interface `ICommand`): wraps the handler in a `IUnitOfWork` transaction. If the handler succeeds, dispatches domain events collected on entities before committing. If the handler throws, rolls back.

```
Command dispatched
    → ValidationBehavior   ← abort if invalid
    → AuthorizationBehavior ← abort if unauthorized
    → LoggingBehavior      ← start timing
        → TransactionBehavior ← begin UoW transaction
            → Handler          ← actual slice logic
        ← dispatch domain events, commit UoW
    ← log elapsed time
```

---

## AddCoreServices()

The single entry point for registering the entire core in the composition root:

```csharp
// Txx.Infrastructure/CoreServiceExtensions.cs
public static IServiceCollection AddCoreServices(this IServiceCollection services, IConfiguration config)
{
    services.AddMediatR(/* ... with all behaviors ... */);
    services.AddValidatorsFromAssemblyContaining<TxxCore>();
    services.AddScoped<IUnitOfWork, EfUnitOfWork>();
    services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
    services.AddScoped(typeof(IReadRepository<>), typeof(EfReadRepository<>));
    services.AddSingleton<IEventBus, MediatREventBus>();
    return services;
}
```

Every subsequent registration (mock, Y, R, slice-specific) builds on top of this foundation.
