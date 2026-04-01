# Feature Organization

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Feature folder | PascalCase domain concept | `Missions`, `MapTracking`, `Personnel` |
| Feature registration class | `{Feature}Feature.cs` | `MissionsFeature.cs` |
| Prism module class | `{Feature}Module.cs` | `MissionsModule.cs` |
| Commands | `{Verb}{Noun}.cs` | `CreateMission.cs`, `ArchiveMission.cs` |
| Queries | `Get{What}.cs` | `GetMissionList.cs`, `GetMissionDetail.cs` |
| ViewModels | `{Screen}ViewModel.cs` | `MissionListViewModel.cs` |
| Views | `{Screen}View.xaml` | `MissionListView.xaml` |
| Domain events | `{Entity}{Verb}Event.cs` | `MissionCreatedEvent.cs` |

---

## Project Layout

Slices live across three projects, mirroring the GYR model:

```
Txx.Features/              ← G-level: all slices, full implementation with mock data
├── Missions/
├── MapTracking/
├── Personnel/
├── Reports/
└── ...

Txx.Features.Y/            ← Y-level: override only what Y changes
├── Missions/
│   └── Infrastructure/    ← real SQL implementations
└── Reports/
    └── Infrastructure/

Txx.Features.R/            ← R-level: override for classified data + R-only slices
├── Missions/
│   └── Infrastructure/
├── ClassifiedIntel/       ← R-only slice (no G/Y counterpart)
└── ...
```

Rule: only create a folder in `Txx.Features.Y` if Y genuinely needs different behavior for that slice. An empty override folder is a smell.

---

## How to Add a New Feature

### 1. Create the slice folder

```
Txx.Features/
└── YourFeature/
    ├── Views/
    ├── ViewModels/
    ├── Commands/
    ├── Queries/
    ├── Domain/
    ├── Validators/
    ├── Infrastructure/
    ├── YourFeatureFeature.cs
    └── YourFeatureModule.cs
```

### 2. Implement the registration class

```csharp
// YourFeatureFeature.cs
public static class YourFeatureFeature
{
    public static IServiceCollection AddYourFeature(this IServiceCollection services)
    {
        services.AddScoped<YourListViewModel>();
        services.AddScoped<YourDetailViewModel>();
        // Repository registered automatically by generic IRepository<T> binding
        // Validators discovered automatically by FluentValidation assembly scan
        return services;
    }
}
```

### 3. Implement the Prism module

```csharp
// YourFeatureModule.cs
public class YourFeatureModule : IModule
{
    public void RegisterTypes(IContainerRegistry containerRegistry)
    {
        containerRegistry.RegisterForNavigation<YourListView, YourListViewModel>();
        containerRegistry.RegisterForNavigation<YourDetailView, YourDetailViewModel>();
    }

    public void OnInitialized(IContainerProvider containerProvider)
    {
        var regionManager = containerProvider.Resolve<IRegionManager>();
        // Add navigation entry to sidebar
        regionManager.RegisterViewWithRegion(RegionNames.Navigation, typeof(YourFeatureNavItem));
    }
}
```

### 4. Register in the composition root

```csharp
// App.xaml.cs — add to the feature registration block:
services.AddYourFeature();

// PrismApplication.RegisterTypes — add to the module registration block:
containerRegistry.RegisterYourFeatureModule();
```

### 5. Write G-level tests

A minimal test project for every new feature:

```
tests/
└── Txx.Features.Missions.Tests/
    ├── Commands/
    │   └── CreateMissionTests.cs
    └── Queries/
        └── GetMissionListTests.cs
```

Tests use the in-memory DB and mock services. They run in G, Y, and R pipelines — if they fail anywhere, the level fails.

---

## Feature Checklist

When a new feature is added, confirm:

- [ ] Slice folder created in `Txx.Features/{Feature}/`
- [ ] All internal dependencies go through `Txx.Core` interfaces (not concrete infrastructure types)
- [ ] Cross-slice communication only via domain events or `Txx.Core.Contracts` interfaces
- [ ] `{Feature}Feature.cs` registration extension created
- [ ] `{Feature}Module.cs` Prism module created
- [ ] Registered in composition root (services + modules)
- [ ] FluentValidation validators for all commands
- [ ] G-level test project created with at least one command test and one query test
- [ ] If Y needs different infrastructure: `Txx.Features.Y/{Feature}/` folder created with only what differs
- [ ] If R needs different infrastructure: `Txx.Features.R/{Feature}/` folder created with only what differs

---

## Composition Root Structure

The composition root (startup project) is the only place that sees all features:

```csharp
// Program.cs or App.xaml.cs

// 1. Core (always first — provides interfaces and pipeline behaviors)
services.AddCoreServices(configuration);

// 2. Infrastructure (provides concrete implementations of core interfaces)
services.AddMockServices();              // G: in-memory DB, mock external services
#if LEVEL_Y || LEVEL_R
services.AddYServices();                 // Y: real DB, real external services
#endif
#if LEVEL_R
services.AddRServices();                 // R: classified DB, classified services
#endif

// 3. Feature slices (always registered — slices are level-agnostic at this point)
services.AddMissionsFeature();
services.AddMapTrackingFeature();
services.AddPersonnelFeature();
services.AddReportsFeature();
#if LEVEL_R
services.AddClassifiedIntelFeature();    // R-only slice
#endif

// 4. UI (shell, Prism regions)
services.AddTxxShell();
```

This ordering guarantees that:
- Core interfaces are registered before any consumer
- Infrastructure overrides run in the correct G → Y → R order
- Slices receive whichever infrastructure implementation is appropriate for the current level
