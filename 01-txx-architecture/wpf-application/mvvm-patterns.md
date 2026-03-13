# MVVM Patterns

## ViewModel-First Approach

TXX uses ViewModel-first navigation (not View-first). Prism resolves the ViewModel from DI, and the View is located by convention:

- `MissionListViewModel` → `MissionListView` (auto-resolved by `ViewModelLocationProvider`)
- Views have no logic; all state and behavior lives in the ViewModel
- No code-behind except for View-specific WPF event wiring that cannot be handled via commands (e.g., keyboard bindings, drag-drop)

---

## TxxViewModelBase

Every ViewModel derives from `TxxViewModelBase` (defined in `Txx.Core`):

```csharp
public abstract class TxxViewModelBase : ObservableObject, INotifyDataErrorInfo, INavigationAware
{
    [ObservableProperty] private bool _isBusy;
    [ObservableProperty] private string? _busyMessage;
    [ObservableProperty] private bool _hasError;
    [ObservableProperty] private string? _errorMessage;

    // Called by Prism when navigating to this ViewModel
    public virtual void OnNavigatedTo(NavigationContext navigationContext) { }
    public virtual void OnNavigatedFrom(NavigationContext navigationContext) { }
    public virtual bool IsNavigationTarget(NavigationContext navigationContext) => true;

    // Validation support
    protected void SetError(string propertyName, string error) { /* ... */ }
    protected void ClearError(string propertyName) { /* ... */ }
    public IEnumerable GetErrors(string? propertyName) { /* ... */ }
    public bool HasErrors { get; }
    public event EventHandler<DataErrorsChangedEventArgs>? ErrorsChanged;
}
```

CommunityToolkit.Mvvm's `[ObservableProperty]` source generator creates the full `IsBusy`, `BusyMessage`, `HasError`, and `ErrorMessage` property implementations at compile time.

---

## Commands

### Async Commands (standard)

```csharp
public partial class MissionListViewModel : TxxViewModelBase
{
    private readonly IMediator _mediator;

    [ObservableProperty] private ObservableCollection<MissionSummary> _missions = new();

    public AsyncRelayCommand LoadCommand { get; }
    public AsyncRelayCommand<MissionSummary> OpenDetailCommand { get; }

    public MissionListViewModel(IMediator mediator)
    {
        _mediator = mediator;
        LoadCommand = new AsyncRelayCommand(LoadAsync);
        OpenDetailCommand = new AsyncRelayCommand<MissionSummary>(OpenDetailAsync);
    }

    private async Task LoadAsync(CancellationToken ct)
    {
        IsBusy = true;
        BusyMessage = "Loading missions...";
        HasError = false;
        try
        {
            var result = await _mediator.Send(new GetMissionList.Query(), ct);
            Missions = new ObservableCollection<MissionSummary>(result.Missions);
        }
        catch (Exception ex)
        {
            HasError = true;
            ErrorMessage = "Failed to load missions.";
            // LoggingBehavior already logged the exception
        }
        finally
        {
            IsBusy = false;
        }
    }
}
```

`AsyncRelayCommand` automatically sets `IsRunning = true` while executing and exposes `CancellationTokenSource` for cancellable operations.

### Guard Commands (authorization-aware)

For commands that require specific policies, wrap with `ITxxCommandGuard`:

```csharp
public IAsyncRelayCommand ArchiveCommand { get; }

public MissionDetailViewModel(IMediator mediator, ITxxCommandGuard guard)
{
    ArchiveCommand = guard.Wrap(
        new AsyncRelayCommand(ArchiveAsync),
        Policies.CanArchiveMissions      // auto-disables if user lacks this policy
    );
}
```

The command's `CanExecute` returns `false` when the user lacks the policy. Buttons bound to it are automatically disabled — no duplication of authorization logic in XAML triggers.

---

## Form Validation

For edit forms, ViewModels implement validation using DataAnnotations on the bound model, dispatched through `INotifyDataErrorInfo`:

```csharp
public partial class CreateMissionViewModel : TxxViewModelBase
{
    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required(ErrorMessage = "Mission name is required")]
    [MaxLength(100)]
    private string _name = string.Empty;

    [ObservableProperty]
    [NotifyDataErrorInfo]
    [Required(ErrorMessage = "Start date is required")]
    private DateTime? _startDate;

    public AsyncRelayCommand SubmitCommand { get; }

    public CreateMissionViewModel(IMediator mediator)
    {
        SubmitCommand = new AsyncRelayCommand(SubmitAsync, () => !HasErrors);
        ErrorsChanged += (_, _) => SubmitCommand.NotifyCanExecuteChanged();
    }
}
```

The `[NotifyDataErrorInfo]` attribute (CommunityToolkit) auto-validates on property change and fires `ErrorsChanged`. The WPF `Validation.ErrorTemplate` displays inline errors. `SubmitCommand.CanExecute` returns `false` while any validation errors exist.

---

## Dependency Injection into ViewModels

ViewModels are resolved from DI — never constructed manually. All dependencies are constructor-injected:

```csharp
// ViewModels receive IMediator for commands/queries, plus specific services
public MissionDetailViewModel(
    IMediator mediator,
    ICurrentUser currentUser,
    INotificationService notifications,
    IRegionManager regionManager)
```

Do not inject `IServiceProvider` into ViewModels. If a ViewModel needs something dynamic, inject a factory interface.

---

## Anti-Patterns to Avoid

| Anti-pattern | Correct approach |
|-------------|-----------------|
| Code-behind with business logic | Move to ViewModel |
| ViewModel calls other ViewModel directly | Use event bus or shared service |
| Direct `new` of services inside ViewModel | Constructor injection |
| `Dispatcher.Invoke` in ViewModel | Use `ObservableCollection` thread-safe wrapper; commands run on UI thread |
| Static singletons for shared state | Scoped or singleton services registered in DI |
| Level-specific `#if` in ViewModel code | Level-specific service implementation injected; ViewModel stays clean |
