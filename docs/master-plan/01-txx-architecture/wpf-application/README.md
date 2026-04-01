# WPF Application Architecture

TXX's desktop frontend is a WPF application built on **Prism 8+** for modular composition and **CommunityToolkit.Mvvm** for MVVM boilerplate reduction. The application is organized as a shell with named regions that feature modules populate — each module corresponds to one vertical slice.

---

## Documents

- [MVVM Patterns](mvvm-patterns.md) — ViewModel base, commands, validation, and the ViewModel-first approach
- [Prism Modules](prism-modules.md) — how feature modules map to G/Y/R levels, module registration, and lifecycle
- [Data Binding Strategy](data-binding-strategy.md) — collections, async loading, paging, converters, and two-way binding rules
- [UI Composition](ui-composition.md) — region layout, shell responsibilities, navigation, and level-specific view registration

---

## Technology Stack

| Concern | Library | Notes |
|---------|---------|-------|
| MVVM framework | CommunityToolkit.Mvvm 8+ | Source generators, ObservableProperty, RelayCommand |
| Modular composition | Prism 8+ (DryIoc) | Modules, regions, navigation, event aggregator |
| Validation | FluentValidation + DataAnnotations | Commands validated in pipeline; forms validated in ViewModel |
| DI container | DryIoc (via Prism) | Replaces Unity from legacy stack |
| Async commands | CommunityToolkit.Mvvm AsyncRelayCommand | Built-in cancellation, IsRunning state |
| Logging | Serilog | Sinks differ per level |

The legacy stack (Unity DI, Prism 6, EF6) is replaced incrementally. New code uses the above. Legacy modules continue to run until rewritten.
