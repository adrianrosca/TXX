# Security & Authentication Architecture

Authentication and authorization in TXX follow the same GYR interface-over-implementation pattern as every other concern. The application code depends only on `ICurrentUser` and `IAuthorizationService` — both are Microsoft standard interfaces, both have level-appropriate implementations.

---

## Documents

- [Authentication](authentication.md) — identity providers per level, token handling, `ICurrentUser` implementation, and session management
- [Authorization](authorization.md) — policy-based authorization, command guards, UI authorization, and role definitions
- [Security Per Level](security-per-level.md) — encryption, audit logging, secret management, network security, and compliance requirements per G/Y/R level

---

## Core Principle

The application never hardcodes identity checks. Every authorization decision goes through a named policy. Every policy is evaluated by `IAuthorizationService`. The policy handlers have access to `ICurrentUser` — and `ICurrentUser` is implemented differently per level.

```
G:  ICurrentUser = MockCurrentUser (hardcoded test identities, no real auth)
Y:  ICurrentUser = AdCurrentUser (backed by Active Directory / OIDC)
R:  ICurrentUser = WindowsCurrentUser (backed by Windows integrated auth on air-gapped domain)
```

The ViewModel, command handlers, and pipeline behaviors call the same interfaces and never know which implementation is active.
