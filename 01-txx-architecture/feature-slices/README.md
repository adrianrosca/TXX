# Vertical Slice Architecture

TXX is organized around **vertical slices** — each feature owns its complete stack from UI to database. This is the primary organizing principle for where code lives and how it grows.

The GYR model answers *which environment does this code run in*. Vertical slices answer *which feature does this code belong to*.

---

## Documents

- [Vertical Slice Principles](vertical-slice-principles.md) — what a slice is, how slices communicate, how G/Y/R overlays apply per slice
- [Strong Core](strong-core.md) — shared abstractions, base types, and MediatR pipeline behaviors that every slice uses
- [Feature Organization](feature-organization.md) — naming conventions, folder layout, and how to add a new feature

---

## The Two Axes

```
                   ┌────────────────────────────────────────┐
                   │           RESTRICTION LEVEL            │
                   │        G          Y          R         │
  ┌────────────────┼──────────────────────────────────────── ┤
  │  Missions      │  mock data    real data   classified    │
F │  MapTracking   │  mock map     real map    classified    │
E │  Personnel     │  mock users   real users  ——            │
A │  Reports       │  mock output  real output real output   │
T │  ClassifiedOps │  ——           ——          R-only slice  │
U └────────────────┴──────────────────────────────────────── ┘
R
E  Each cell = a slice implementation for that level.
S  Empty cell = that level uses the level below's implementation.
   ——  = feature does not exist at that level.
```

Features grow vertically. G/Y/R overlays grow horizontally. The intersection is where real application behavior lives.
