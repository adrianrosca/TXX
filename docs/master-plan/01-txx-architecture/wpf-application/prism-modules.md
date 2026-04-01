# Prism Modules

## Module Purpose

Each vertical feature slice has one Prism module that handles:
1. **Type registration** — registers Views and ViewModels for navigation
2. **Region contribution** — adds navigation entries, toolbars, or views to shell regions
3. **Initialization** — any startup work required after DI is fully built

Modules do NOT register services or repositories — that is the slice's `{Feature}Feature.cs` extension. The module only handles Prism/UI concerns.

---

## Module Structure

```csharp
public class MissionsModule : IModule
{
    // 1. Called during container build — register Views for Prism navigation
    public void RegisterTypes(IContainerRegistry containerRegistry)
    {
        containerRegistry.RegisterForNavigation<MissionListView, MissionListViewModel>();
        containerRegistry.RegisterForNavigation<MissionDetailView, MissionDetailViewModel>();
        containerRegistry.RegisterForNavigation<CreateMissionView, CreateMissionViewModel>();
    }

    // 2. Called after container is built — contribute to regions
    public void OnInitialized(IContainerProvider containerProvider)
    {
        var regionManager = containerProvider.Resolve<IRegionManager>();

        // Add Missions entry to sidebar navigation
        regionManager.RegisterViewWithRegion(
            RegionNames.Navigation,
            typeof(MissionsNavItem)
        );
    }
}
```

---

## Module Registration Across G/Y/R

Modules follow the same DI composition pattern as services. The WPF app uses Prism's `IModuleCatalog` populated at startup:

```csharp
// PrismApplication subclass (App.xaml.cs)
protected override void ConfigureModuleCatalog(IModuleCatalog moduleCatalog)
{
    // Shell (always first — defines all regions)
    moduleCatalog.AddModule<ShellModule>();

    // G-level modules (always loaded)
    moduleCatalog.AddModule<MissionsModule>();
    moduleCatalog.AddModule<MapTrackingModule>();
    moduleCatalog.AddModule<PersonnelModule>();
    moduleCatalog.AddModule<ReportsModule>();

    // Y-level modules (overlay — replace or extend G views)
#if LEVEL_Y || LEVEL_R
    moduleCatalog.AddModule<MissionsYModule>(
        dependsOn: nameof(MissionsModule)          // loads after G module
    );
    moduleCatalog.AddModule<ReportsYModule>(
        dependsOn: nameof(ReportsModule)
    );
#endif

    // R-level modules
#if LEVEL_R
    moduleCatalog.AddModule<MissionsRModule>(
        dependsOn: nameof(MissionsYModule)
    );
    moduleCatalog.AddModule<ClassifiedIntelModule>();   // R-only — no G/Y counterpart
#endif
}
```

### How overlay modules work

A Y module can replace a G module's view registration for a region:

```csharp
// MissionsYModule.cs — replaces the G version of the mission list with the real-data version
public class MissionsYModule : IModule
{
    public void RegisterTypes(IContainerRegistry containerRegistry)
    {
        // Override navigation registration — same key, different ViewModel
        containerRegistry.RegisterForNavigation<MissionListView, MissionListYViewModel>(
            NavigationKeys.MissionList    // same key as G registration — overwrites it
        );
    }

    public void OnInitialized(IContainerProvider containerProvider) { }
}
```

G and Y modules use the same navigation key. Because Y module loads after G (`dependsOn`), its registration wins. The rest of the application navigates by key and never knows which ViewModel it received.

---

## Shell Module

The shell module is special — it creates the main window and defines all regions. It has no feature logic.

```csharp
public class ShellModule : IModule
{
    public void RegisterTypes(IContainerRegistry containerRegistry)
    {
        containerRegistry.RegisterSingleton<IRegionNavigationService, TxxRegionNavigationService>();
        containerRegistry.RegisterSingleton<IShellNavigationService, ShellNavigationService>();
    }

    public void OnInitialized(IContainerProvider containerProvider)
    {
        var regionManager = containerProvider.Resolve<IRegionManager>();
        var shell = containerProvider.Resolve<MainWindow>();

        RegionManager.SetRegionManager(shell, regionManager);
        Application.Current.MainWindow = shell;
        shell.Show();
    }
}
```

The `MainWindow` XAML defines all region names as `RegionManager.RegionName` attached properties. Feature modules never touch the main window directly.

---

## Module Dependency Order

```
ShellModule                          ← 1. Regions available
    ↓
MissionsModule                       ← 2. G feature modules (any order among peers)
MapTrackingModule
PersonnelModule
ReportsModule
    ↓ (Y only)
MissionsYModule                      ← 3. Y overlay modules (depend on G counterpart)
ReportsYModule
    ↓ (R only)
MissionsRModule                      ← 4. R overlay modules (depend on Y counterpart)
ClassifiedIntelModule                ← 4. R-only modules (no dependency on G/Y)
```

Prism respects `dependsOn` to guarantee registration order. A module that depends on another will not initialize until its dependency is fully initialized.

---

## Region Names

All region names are string constants in a shared `RegionNames` static class to avoid magic strings:

```csharp
public static class RegionNames
{
    public const string Header   = "HEADER_REGION";
    public const string Navigation = "NAVIGATION_REGION";
    public const string Main     = "MAIN_CONTENT_REGION";
    public const string Map      = "MAP_REGION";
    public const string Status   = "STATUS_REGION";
    public const string Dialogs  = "DIALOG_REGION";
}
```
