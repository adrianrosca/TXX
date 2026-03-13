# Data Binding Strategy

## Binding Modes

| Use case | Binding mode | Reason |
|----------|-------------|--------|
| List and display data | `OneWay` | Read-only, reduces change notification overhead |
| Edit form inputs | `TwoWay` | Needs to write back to ViewModel |
| Commands | `OneWay` (default for `ICommand`) | Commands are push, not pull |
| Status indicators (IsBusy, HasError) | `OneWay` | View reads ViewModel state |
| Selected item in a list | `TwoWay` | Selection drives navigation |

Default all bindings to `OneWay` explicitly in styles. Only override to `TwoWay` on form inputs. This makes intent clear and prevents accidental two-way binding on display controls.

---

## Collections

### ObservableCollection Usage

```csharp
// ViewModel
[ObservableProperty]
private ObservableCollection<MissionSummary> _missions = new();

// Load: always replace the collection reference (triggers CollectionChanged on binding)
Missions = new ObservableCollection<MissionSummary>(result.Missions);

// Incremental update: only add/remove (keeps scroll position)
foreach (var item in newItems) Missions.Add(item);
```

Never mutate a collection from a background thread. The `TxxObservableList<T>` wrapper (defined in `Txx.Core`) marshals all modifications to the UI thread:

```csharp
public class TxxObservableList<T> : ObservableCollection<T>
{
    protected override void OnCollectionChanged(NotifyCollectionChangedEventArgs e)
    {
        if (Application.Current?.Dispatcher.CheckAccess() == false)
            Application.Current.Dispatcher.Invoke(() => base.OnCollectionChanged(e));
        else
            base.OnCollectionChanged(e);
    }
}
```

Use `TxxObservableList<T>` when a background service updates a collection that the UI is bound to (e.g., live map track updates).

### Paging for Large Datasets

Lists that can grow large (thousands of items) use cursor-based paging:

```csharp
// Query result
public record GetMissionList.Result(
    IReadOnlyList<MissionSummary> Missions,
    string? NextCursor,      // null = last page
    int TotalCount
);

// ViewModel
[ObservableProperty] private bool _hasMorePages;
[ObservableProperty] private int _totalCount;

public AsyncRelayCommand LoadNextPageCommand { get; }

private async Task LoadNextPageAsync(CancellationToken ct)
{
    var result = await _mediator.Send(new GetMissionList.Query(_nextCursor), ct);
    foreach (var m in result.Missions) Missions.Add(m);
    _nextCursor = result.NextCursor;
    HasMorePages = result.NextCursor is not null;
    TotalCount = result.TotalCount;
}
```

The UI binds `LoadNextPageCommand` to a "Load more" button or to a `ScrollViewer` trigger when near the bottom.

---

## Async Loading Pattern

All data loads follow the same pattern:

```csharp
private async Task LoadAsync(CancellationToken ct)
{
    IsBusy = true;
    BusyMessage = "Loading...";
    HasError = false;
    ErrorMessage = null;
    try
    {
        // Send MediatR query — pipeline handles validation, auth, logging
        var result = await _mediator.Send(new MyQuery(), ct);
        Data = new ObservableCollection<MyItem>(result.Items);
    }
    catch (OperationCanceledException)
    {
        // Navigation cancelled the load — silent, expected
    }
    catch (UnauthorizedException)
    {
        HasError = true;
        ErrorMessage = "You do not have permission to view this data.";
    }
    catch (Exception)
    {
        HasError = true;
        ErrorMessage = "Failed to load data. Please try again.";
        // Exception details already logged by LoggingBehavior in pipeline
    }
    finally
    {
        IsBusy = false;
    }
}
```

The View binds `IsBusy` to a loading overlay and `HasError` to an error panel. Both are defined in the `TxxViewModelBase` so all screens get this behavior for free.

---

## DataTemplates

### Centralised registration

Feature slices register their DataTemplates in a `{Feature}DataTemplates.xaml` resource dictionary, merged in the feature module's `OnInitialized`:

```csharp
// MissionsModule.cs
public void OnInitialized(IContainerProvider containerProvider)
{
    Application.Current.Resources.MergedDictionaries.Add(
        new ResourceDictionary
        {
            Source = new Uri("/Txx.Features;component/Missions/MissionsDataTemplates.xaml",
                             UriKind.Relative)
        });
}
```

### Level-specific DataTemplates

If Y or R needs to display additional fields in a shared template, the Y/R module merges its own override dictionary after G's:

```xaml
<!-- MissionsYDataTemplates.xaml — overrides G's MissionSummary template -->
<DataTemplate DataType="{x:Type dto:MissionSummary}">
    <!-- Same structure as G but with additional Y fields -->
</DataTemplate>
```

Because WPF uses the last registered DataTemplate for a given type, Y/R dictionaries win over G dictionaries.

---

## Value Converters

All converters live in `Txx.Presentation.Converters` and are registered in a shared `ConverterDictionary.xaml` resource dictionary, merged at application startup.

| Converter | Use |
|-----------|-----|
| `BoolToVisibilityConverter` | `IsBusy`, `HasError` → Collapsed/Visible |
| `NullToVisibilityConverter` | Optional data → Collapsed when null |
| `InverseBoolConverter` | For negative conditions |
| `EnumToDisplayNameConverter` | Enum values → localized strings |
| `DateTimeFormatConverter` | DateTime → display string (locale-aware) |
| `RelativeTimeConverter` | Recent DateTime → "2 minutes ago" |
| `LevelColorConverter` | `RestrictionLevel` → accent color (G=green, Y=yellow, R=red) |

The `LevelColorConverter` is used throughout the shell to provide a persistent visual cue of the active restriction level.

---

## XAML Guidelines

- Use `{x:Static}` for all string constants (RegionNames, command names, style keys) — never hardcode strings in XAML
- All styles defined in resource dictionaries, never inline
- Use `x:Name` only for elements that require code-behind event wiring; everything else via binding
- Avoid `RelativeSource FindAncestor` for data — pass data via ViewModel properties instead
- Virtualize all lists (`VirtualizingStackPanel.IsVirtualizing="True"` + `VirtualizationMode="Recycling"`) — mandatory for any list that can exceed 100 items
