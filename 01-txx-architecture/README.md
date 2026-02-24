# TXX Architecture

## Purpose

This document set defines the next-generation TXX system architecture built around **three restriction levels** (G, Y, R). Code flows from the least restricted environment to the most restricted, composing into a single application at the final stage.

**Tech stack:** .NET

## Core Concept

```
G code  →  Y code  →  R code  =  Full Application
```

- **G** provides the architectural frame (mockup features, mockup data)
- **Y** adds restricted features and data on top of G
- **R** adds highly restricted features and data on top of Y

No single level contains the full application. Only the composed R build is the complete product.

## Documents

Read in this order:

| # | Document | Description |
|---|----------|-------------|
| 1 | [restriction-levels.md](restriction-levels.md) | G / Y / R definitions, rules, and boundaries |
| 2 | [dotnet-architecture.md](dotnet-architecture.md) | .NET solution structure, DI strategy, config layering |
| 3 | [layer-composition.md](layer-composition.md) | How G + Y + R compose into one running application |
| 4 | [repo-strategy.md](repo-strategy.md) | Git repositories, branching, sync, and access control |
| 5 | [ci-cd-pipeline.md](ci-cd-pipeline.md) | Continuous integration chain: G → Y → R |
