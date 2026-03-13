# Map / Carmenta Integration

TXX uses Carmenta Engine as its map rendering component. The map is embedded in the WPF application as a region (`MAP_REGION`) and is controlled entirely through the `IMapService` abstraction — the application code never calls Carmenta APIs directly.

---

## Documents

- [Carmenta Integration](carmenta-integration.md) — how the Carmenta WPF control is wrapped, the `IMapService` contract, and how the map region fits into UI composition
- [Map GYR Levels](map-gyr-levels.md) — data sources, layer configuration, and offline tile strategy per restriction level

---

## Architecture in One Line

```
ViewModel → IMapService → CarmentaMapService → Carmenta Engine WPF Control
                 ↑
           MockMapService (G-level)
```

All map operations go through `IMapService`. The ViewModel never knows whether it is talking to a real Carmenta instance or a mock. This makes G-level development fully functional without a Carmenta license on every developer machine.
