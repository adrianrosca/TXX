# TXX Master Plan — Executive Summary

## Vision

TXX is a next-generation system designed to operate across three distinct security environments — public (G), restricted (Y), and classified (R) — while maintaining a single cohesive codebase, modern developer experience, and UX-driven design process. The master plan addresses three strategic pillars: multi-level architecture, UX-first development, and AI-assisted workflows.

---

## 1. Three-Level Architecture (G / Y / R)

The core strategy is a **non-destructive overlay model** where each security level builds on the one below it.

| Level | Purpose | Environment | Data |
|-------|---------|-------------|------|
| **G** | Architectural frame | Full internet, any tools | Mockup only |
| **Y** | Restricted features | Approved services only | Y-classified |
| **R** | Complete application | Air-gapped, zero internet | All classified |

**Key principles:**

- **G defines everything** — full UI, API contracts, domain models, infrastructure — all backed by mock data. A developer working at G sees a complete, functional application with no indication of what the real data looks like.
- **Y overlays G** — replaces specific mock implementations with real Y-level features and data through dependency injection. G code remains untouched.
- **R overlays Y** — adds the final classified components. Only the composed R build is the complete product.
- **Code flows one direction only: G → Y → R.** No data or code ever moves upward. This is enforced by repository separation, access controls, automated namespace scanning, and code review gates.

### .NET Solution Structure

Built on **.NET 8+ (LTS)** with clean architecture:

- **Txx.Core** and **Txx.Application** are level-neutral (shared domain and use cases).
- **Txx.Infrastructure.Mock** provides G-level implementations.
- **Txx.Features.Y / Infrastructure.Y** and **Txx.Features.R / Infrastructure.R** provide level-specific overrides.
- **Solution filters** (`.slnf`) control which projects are visible at each level.
- **DI registration chain**: G registers all mocks first → Y replaces what it needs → R replaces what it needs. No removals, only replacements.

### Repository & CI/CD Strategy

Three separate Git repositories mirror the security levels:

- **G Repo** — Private GitHub. Standard CI pipeline (build, test, scan, publish).
- **Y Repo** — Internal server. Pulls G upstream, merges, runs G + Y test suites.
- **R Repo** — Air-gapped server. Receives Y via **physical transfer bundles** containing source code, NuGet packages, LLM models, tools, and SHA-256 checksums. Runs all three test suites before deployment.

Each level has escalating code review requirements (peer review at G, plus security review at Y and R).

---

## 2. UX-First Process

The strategy shifts UI decision-making from developers to designers through a formal lifecycle.

**The problem:** Developer-driven UI decisions lead to inconsistent patterns and UX debt.

**The solution:** An eight-phase design-first workflow:

1. Requirements gathering
2. User research & analysis
3. Wireframing (low-fidelity, all screens and states)
4. Interactive prototyping (clickable, realistic content, edge cases)
5. **Design review & approval gate** — requires sign-off from UX lead, product owner, and tech lead
6. Design handoff (annotated specs, component breakdowns, interaction specs, data requirements)
7. Development (to spec)
8. Design validation (compliance check before merge)

**Level-aware design:** Designers are cleared per level. G-cleared designers work on the full UI with mock data. Y/R-cleared designers handle level-specific features in separate design cycles.

**Developer guardrail:** Developers implement to specification. UI changes require designer approval. Disagreements escalate — developers do not override design decisions.

---

## 3. AI-Assisted Workflow

AI tooling scales across all three levels, with a dedicated local LLM strategy for R.

| Capability | G | Y | R |
|------------|---|---|---|
| Cloud LLMs | Any (Claude, GPT, Copilot) | Approved only | None |
| Code completion | Any IDE plugin | Approved plugins | Local LLM |
| Chat / review / docs / tests | Any AI tool | Approved tools | Local LLM |
| Web search | Unrestricted | Restricted | Local doc mirrors |

### R-Level Local LLM Infrastructure

Since R developers work in a zero-internet environment, a self-contained AI stack is deployed:

- **Runtime:** Ollama serving an OpenAI-compatible API on local network
- **Primary model:** DeepSeek Coder V2 (33B) for code generation and chat
- **Secondary model:** Qwen2.5-Coder (14B) for fast completions
- **IDE integration:** Continue.dev or custom extension connecting to Ollama
- **RAG pipeline:** Codebase indexed into a vector store (ChromaDB/Qdrant) using embedding models, enabling context-aware answers grounded in TXX source code
- **Local documentation mirrors:** Offline copies of .NET, EF Core, and ASP.NET docs

**Hardware tiers:** RTX 4090 for small teams (1–3 devs), A100 40/80GB for medium teams (5–15), dual A100/H100 for optimal quality with 70B models.

**Model lifecycle:** Models are sourced at G, validated at Y, bundled into air-gap transfers, and loaded at R. Previous models are kept as fallback. Version tracking via MODELS.json with checksums.

---

## Cross-Cutting Themes

1. **Interface-driven design** — All boundaries are defined by interfaces. Levels differ only in implementation, never in contract.
2. **Unidirectional flow** — Code, data, dependencies, models, and tools flow G → Y → R. Never backward.
3. **Self-contained R environment** — Everything R needs travels in via verified transfer bundles: source code, packages, AI models, documentation, and tools.
4. **Progressive restriction** — Each level adds constraints but never removes capabilities from the level above. G tests pass at Y; G + Y tests pass at R.
5. **Formal approval gates** — Design approval before development. Dependency approval before adoption. Transfer approval before air-gap crossing. Code review with security sign-off at Y and R.

---

## Reading Order

For the full details behind this summary:

| # | Document | Topic |
|---|----------|-------|
| 1 | `01-txx-architecture/README.md` | Architecture overview |
| 2 | `01-txx-architecture/restriction-levels.md` | G/Y/R level definitions and boundary rules |
| 3 | `01-txx-architecture/dotnet-architecture.md` | .NET solution structure and DI strategy |
| 4 | `01-txx-architecture/layer-composition.md` | How G + Y + R compose into one application |
| 5 | `01-txx-architecture/repo-strategy.md` | Git repositories, branching, and sync |
| 6 | `01-txx-architecture/ci-cd-pipeline.md` | CI/CD chain and air-gap transfer process |
| 7 | `02-ux-first-process/README.md` | UX-first process overview |
| 8 | `02-ux-first-process/design-workflow.md` | Full design lifecycle and approval gates |
| 9 | `02-ux-first-process/design-to-dev-handoff.md` | Handoff artifacts and developer rules |
| 10 | `03-ai-workflow/README.md` | AI strategy overview |
| 11 | `03-ai-workflow/ai-strategy-by-level.md` | AI tools and models per level |
| 12 | `03-ai-workflow/r-level-local-llm.md` | R-level local LLM infrastructure |
