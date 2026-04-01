# UI Composition

## Region Layout

The shell defines five permanent regions. Feature modules populate them. The shell itself never knows what is inside them.

```
┌─────────────────────────────────────────────────────┐
│                  HEADER_REGION                       │
│   App title | User info | Level indicator | Alerts  │
├──────────────┬──────────────────────────────────────┤
│              │                                       │
│  NAVIGATION  │           MAIN_CONTENT_REGION         │
│    REGION    │      (primary workspace — single      │
│              │       active view at a time)          │
│  (sidebar    ├──────────────────────────────────────┤
│   nav list)  │                                       │
│              │              MAP_REGION               │
│              │    (Carmenta map — collapsible,        │
│              │     split or overlay mode)            │
│              │                                       │
├──────────────┴──────────────────────────────────────┤
│                  STATUS_REGION                       │
│    Connection state | Active operation | Level tag  │
└─────────────────────────────────────────────────────┘
```

An off-screen `DIALOG_REGION` hosts modal dialogs injected by `INotificationService`.

---

## Shell Responsibilities

The shell (`MainWindow.xaml`) does exactly three things:
1. Declares all `RegionManager.RegionName` attached properties
2. Defines the layout grid
3. Wires keyboard shortcuts to `IShellNavigationService`

The shell has no data bindings to features. Its ViewModel (`MainWindowViewModel`) binds only to:
- `ICurrentUser.DisplayName` — shown in header
- `ICurrentUser.Level` — drives the level indicator color via `LevelColorConverter`
- `INotificationService` notifications — drives the alert count badge

---

## Navigation

Navigation uses Prism's `IRegionManager.RequestNavigate` — always ViewModel-initiated, never triggered from code-behind:

```csharp
// In a ViewModel:
_regionManager.RequestNavigate(
    RegionNames.Main,
    NavigationKeys.MissionDetail,
    new NavigationParameters { { "missionId", selectedMission.Id } }
);
```

`NavigationKeys` is a static class of string constants — same pattern as `RegionNames`.

### Navigation parameter passing

```csharp
// NavigationKeys.cs
public static class NavigationKeys
{
    public const string MissionList   = "MissionList";
    public const string MissionDetail = "MissionDetail";
    public const string MapView       = "MapView";
    // ...
}

// Receiving ViewModel reads parameters:
public override void OnNavigatedTo(NavigationContext ctx)
{
    if (ctx.Parameters.TryGetValue<Guid>("missionId", out var id))
        LoadCommand.Execute(id);
}
```

### Back navigation

The shell maintains a navigation journal per region. `IShellNavigationService` exposes `GoBack()` and `CanGoBack`, allowing a consistent back-button experience without coupling features to each other.

---

## Level-Specific View Switching

When a Y or R module overrides a G view (see [Prism Modules](prism-modules.md)), the region receives the override transparently. No conditional XAML is needed in the shell or in feature views.

For cases where a feature's view needs to show/hide elements based on the current user's level, use `ICurrentUser.Level` via a binding:

```xaml
<!-- Show classified section only when user has R-level access -->
<StackPanel Visibility="{Binding CurrentUser.Level,
                                  Converter={StaticResource LevelToVisibilityConverter},
                                  ConverterParameter=R}">
    <TextBlock Text="Classified data..." />
</StackPanel>
```

`LevelToVisibilityConverter` returns `Visible` when the user's level is equal to or higher than the parameter. Defined in `Txx.Presentation.Converters`.

Prefer this over `#if` directives in XAML — it avoids build-time branching in the View layer and keeps the view clean and testable.

---

## Map Region Integration

The map region can operate in three modes, controlled by `IMapLayoutService`:

| Mode | Description | When |
|------|-------------|------|
| `Hidden` | Map region collapsed, full space to main content | Non-geographic features |
| `Split` | Map takes lower half, main content upper half | Operational views with geo context |
| `Overlay` | Map fills the full content area, main content overlays | Dedicated map-focused views |

Feature modules request a mode change when they activate:

```csharp
// MissionDetailViewModel.OnNavigatedTo
_mapLayout.RequestMode(MapLayoutMode.Split);
```

The shell listens to `IMapLayoutService` and adjusts grid row sizes via animation.

---

## Dialog Composition

Dialogs are not Window instances — they are views injected into `DIALOG_REGION`. This keeps them inside the application boundary, theme-consistent, and testable.

```csharp
// Requesting a dialog from a ViewModel:
var confirmed = await _notifications.ConfirmAsync(
    title: "Archive Mission",
    message: "This mission will be archived. Continue?"
);

if (confirmed)
    await _mediator.Send(new ArchiveMission.Command(Mission.Id));
```

`INotificationService.ConfirmAsync` navigates a `ConfirmDialogView` into `DIALOG_REGION`, overlays a scrim, and returns the result as a `Task<bool>`. The ViewModel never creates a `Window` directly.

---

## Startup Sequence

```
1. PrismApplication.OnStartup
2. ConfigureServices (core + infrastructure + feature registrations)
3. ConfigureModuleCatalog (shell + G modules + Y/R modules if applicable)
4. ShellModule.OnInitialized → creates MainWindow, shows it
5. G feature modules initialize → register views, populate NAVIGATION_REGION
6. Y/R modules initialize (if applicable) → override G registrations
7. IShellNavigationService.NavigateToDefault → loads default view into MAIN_CONTENT_REGION
```

Default view is determined by `ICurrentUser.Roles` — different roles land on different starting screens.
