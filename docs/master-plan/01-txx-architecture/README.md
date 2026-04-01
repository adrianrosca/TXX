# TXX Architecture

This section covers the complete architectural blueprint for TXX. Architecture is organized into five focused areas that work together to form the full system.

---

## Sections

### [GYR Model](gyr-model/)
The security-restriction model that underlies everything. Defines three levels (G, Y, R) with unidirectional code flow, DI override chains, repository strategy, and CI/CD pipeline including air-gap transfer.

### [Vertical Slice Architecture](feature-slices/)
How features are structured inside TXX. Each feature is a self-contained vertical slice (View → ViewModel → Command/Query → Domain → Infrastructure). A strong shared core provides cross-cutting building blocks to all slices.

### [WPF Application](wpf-application/)
The desktop frontend. Covers MVVM patterns, Prism module system, data binding strategy, and UI region composition — all mapped to the G/Y/R model.

### [Data Layer](data-layer/)
Persistence strategy. EF Core 8, repository pattern, unit of work, and database configuration per restriction level.

### [Map / Carmenta](map-carmenta/)
Integration of the Carmenta Engine map control. Abstracted behind `IMapService` so G runs with a mock, Y and R use real Carmenta data sources and classified layers.

### [Security & Auth](security-auth/)
Authentication, authorization, and the security model across levels. `ICurrentUser`, policy-based authorization, level-specific identity providers, and audit logging.

---

## Core Principle

Every section follows the same pattern inherited from the GYR model:

```
Interface defined in Txx.Core          ← contract, shared by all levels
Mock implementation in Txx.Infrastructure.Mock   ← G-level (always registered)
Real implementation in Txx.Infrastructure.Y      ← Y-level (replaces mock)
Classified implementation in Txx.Infrastructure.R ← R-level (replaces Y)
```

No section breaks this rule. G tests pass at Y and R. Code flows only downward: G → Y → R.
