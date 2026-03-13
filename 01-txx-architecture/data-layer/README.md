# Data Layer Architecture

TXX uses **Entity Framework Core 8** for persistence, organized around the repository pattern and unit of work. The data layer is the infrastructure layer of each vertical slice — it implements the `IRepository<T>` and `IReadRepository<T>` contracts defined in `Txx.Core`.

---

## Documents

- [EF Strategy](ef-strategy.md) — DbContext design, configuration, migrations, and G/Y/R database setup
- [Repository Pattern](repository-pattern.md) — generic repositories, specification pattern, and slice-specific query extensions
- [Database Per Level](database-per-level.md) — which engine per level, schema strategy, migration workflow, and seed data

---

## Key Principles

1. **Slices own their entities** — `Mission.cs` lives in `Txx.Features/Missions/Domain/`. `TxxDbContext` includes it via `DbSet<Mission>` but doesn't define the entity.
2. **No raw SQL in slices** — queries go through EF or the specification pattern. Raw SQL only in explicitly named query services (e.g., `IMissionReportQueryService`) when EF performance is insufficient.
3. **Read and write paths are separate** — `IReadRepository<T>` uses no-tracking queries; `IRepository<T>` tracks for change detection.
4. **Transactions are managed by the pipeline** — the `TransactionBehavior` in the MediatR pipeline wraps commands in a unit of work. Handlers never call `SaveChanges()` directly.
