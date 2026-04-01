# Vertical Slice Principles

## What a Slice Is

A vertical slice is a feature folder that owns everything needed to implement that feature — from the WPF view down to the database query. Nothing outside the slice needs to change when you add a new feature. Nothing inside the slice knows about other slices.

### Slice folder layout

```
Txx.Features/
└── Missions/
    ├── Views/
    │   ├── MissionListView.xaml
    │   ├── MissionListView.xaml.cs
    │   ├── MissionDetailView.xaml
    │   └── MissionDetailView.xaml.cs
    ├── ViewModels/
    │   ├── MissionListViewModel.cs
    │   └── MissionDetailViewModel.cs
    ├── Commands/
    │   ├── CreateMission.cs          ← Command + Handler in same file
    │   ├── UpdateMissionStatus.cs
    │   └── ArchiveMission.cs
    ├── Queries/
    │   ├── GetMissionList.cs         ← Query + Handler + Result in same file
    │   └── GetMissionDetail.cs
    ├── Domain/
    │   ├── Mission.cs                ← Aggregate root
    │   ├── MissionStatus.cs          ← Value object / enum
    │   └── MissionCreatedEvent.cs    ← Domain event
    ├── Validators/
    │   ├── CreateMissionValidator.cs
    │   └── UpdateMissionStatusValidator.cs
    ├── Infrastructure/
    │   └── MissionRepository.cs      ← Implements IRepository<Mission>
    ├── MissionsFeature.cs            ← services.AddMissionsFeature() extension
    └── MissionsModule.cs             ← Prism module: RegisterTypes + OnInitialized
```

Every file in `Missions/` concerns only missions. No file in `Reports/` reaches into `Missions/` infrastructure. No file in `Missions/` reaches into `MapTracking/` queries.

---

## Slice Registration

Each slice exposes exactly one service registration extension and one Prism module:

```csharp
// Txx.Features/Missions/MissionsFeature.cs
public static class MissionsFeature
{
    public static IServiceCollection AddMissionsFeature(this IServiceCollection services)
    {
        // Register slice-specific services not covered by generic registrations
        services.AddScoped<IRepository<Mission>, MissionRepository>();
        services.AddScoped<MissionListViewModel>();
        services.AddScoped<MissionDetailViewModel>();
        return services;
    }
}

// Composition root registers all slices:
services.AddCoreServices();         // Strong core (always first)
services.AddMissionsFeature();
services.AddMapTrackingFeature();
services.AddPersonnelFeature();
services.AddReportsFeature();
// ...
```

The composition root is the only place that knows which features are loaded. It lives in the startup project, not in the features themselves.

---

## How Slices Communicate

Slices never call each other directly. Two allowed communication mechanisms:

### 1. Domain Events (async, decoupled)

```csharp
// Missions raises an event
public class MissionCreatedEvent : DomainEvent
{
    public Guid MissionId { get; init; }
    public string MissionName { get; init; }
}

// MapTracking handles it — in MapTracking's own folder
public class PlotNewMissionOnMapHandler : INotificationHandler<MissionCreatedEvent>
{
    // ...
}
```

`IEventBus` (defined in `Txx.Core`) dispatches events. Handlers are discovered automatically by MediatR. A handler in slice B listening to an event from slice A is the only form of cross-slice coupling, and it's one-directional (A does not know B exists).

### 2. Shared Contracts via Txx.Core

When slice B genuinely needs to query slice A's data, the query is defined in `Txx.Core.Contracts` as a shared interface:

```csharp
// Txx.Core/Contracts/IMissionReadModel.cs
public interface IMissionReadModel
{
    Task<MissionSummary[]> GetActiveMissionsAsync();
}
```

Slice A implements it. Slice B depends on the interface, not on Missions directly. This is rare — most slices are independent.

---

## G/Y/R Overlay Per Slice

The GYR model applies to every slice independently. Each level can override exactly what it needs in a given slice, without touching other slices.

### Slice layout across levels

```
Txx.Features/                        ← G: complete slice with mock data
└── Missions/
    ├── Commands/CreateMission.cs     ← real command logic (shared all levels)
    ├── Infrastructure/
    │   └── MissionRepository.cs     ← queries in-memory DB (G mock)
    └── ...

Txx.Features.Y/                      ← Y: overrides infrastructure only
└── Missions/
    └── Infrastructure/
        └── MissionRepository.cs     ← same interface, queries real SQL Server

Txx.Features.R/                      ← R: overrides for classified data
└── Missions/
    └── Infrastructure/
        └── MissionRepository.cs     ← same interface, includes classified columns
```

The ViewModel, commands, and queries don't change between levels. Only the infrastructure (data access, external services) changes. This is enforced by the interface contracts in `Txx.Core`.

### R-only slices

Some features exist only at R level — they have no G or Y equivalent and no mock:

```csharp
// Only loaded under #if LEVEL_R in composition root
#if LEVEL_R
services.AddClassifiedIntelFeature();
cr.RegisterClassifiedIntelModule();
#endif
```

R-only slices are not tested at G or Y. Their test suite runs only in the R pipeline.

---

## What Belongs in a Slice vs. the Core

| Belongs in a slice | Belongs in the core |
|--------------------|---------------------|
| Feature-specific ViewModels | `TxxViewModelBase` |
| Feature commands and queries | MediatR pipeline behaviors |
| Feature domain entities | `EntityBase`, `DomainEvent` |
| Feature validators | `ValidationBehavior` |
| Feature repositories | `IRepository<T>`, `IUnitOfWork` |
| Feature Prism module | Shell, region definitions |
| Feature domain events | `IEventBus` |

The core never contains business logic. A slice never re-implements cross-cutting concerns.
