# Map Architecture Per Level

## Layer Model

The map is composed of stacked layers. Each level contributes its own layers on top of lower-level layers. Layers are defined in `MapLayerDefinition` objects and registered through `IMapService.AddLayerAsync()`.

```
R layer stack:
    ┌─────────────────────────────┐
    │  R Classified Overlays      │  ← R only
    │  R Classified Base Layers   │  ← R only
    ├─────────────────────────────┤
    │  Y Operational Overlays     │  ← Y + R
    │  Y Tile Map (real data)     │  ← Y + R
    ├─────────────────────────────┤
    │  G Feature Overlays (mock)  │  ← G only (replaced by Y at Y+R)
    │  G Mock Base Map            │  ← G only (replaced by Y at Y+R)
    └─────────────────────────────┘
```

Layer visibility and ordering are controlled via `IMapService`. The ViewModel requests layers by logical name — the service maps them to actual Carmenta layer configurations.

---

## G Level

**Base map**: Static image tile (pre-rendered screenshot of a generic topographic map). Sufficient for UI development and layout validation.

**Feature layers**: WPF-drawn shapes overlaid on the static image:
- Colored circles for mock entity positions
- Polylines for mock routes
- Labeled rectangles for mock zones/sectors

**Implementation**: `MockMapCanvas` — a WPF `Canvas` subclass that renders `MapOverlay` objects as WPF drawing primitives. No geo-projection; positions are scaled linearly to canvas coordinates using a fixed reference bounding box.

**Purpose**: All UI, ViewModel logic, and data binding is fully exercisable without a real map. G developers can build and test every map-driven feature.

---

## Y Level

**Base map**: Carmenta Engine loading tiles from the approved internal tile server. Coordinate system: WGS84.

**Map definition file**: `.cpd` (Carmenta Map Definition) stored in the Y application data directory. Path configured in `appsettings.Y.json`:
```json
{
  "Carmenta": {
    "MapDefinitionPath": "C:\\TXX\\Maps\\txx-y-map.cpd",
    "TileServerUrl": "https://tiles.internal.y/",
    "CacheDir": "C:\\TXX\\Cache\\Tiles"
  }
}
```

**Feature layers**:
- Real entity positions from operational data (missions, personnel, assets)
- WMS/WFS layers from approved Y geospatial servers
- Dynamic overlays updated via `IEventBus` domain events (e.g., `AssetPositionUpdatedEvent` → `IMapService.UpdateOverlayAsync`)

**Offline tile cache**: Carmenta's local tile cache is populated from the tile server when online. TXX pre-warms the cache for the operational area on startup.

---

## R Level

**Base map**: Classified tile set loaded from the local R geospatial server (no internet, no Y tile server). The classified base map travels in the Y→R transfer bundle as a tile cache package.

```json
// appsettings.R.json
{
  "Carmenta": {
    "MapDefinitionPath": "C:\\TXX\\Maps\\txx-r-map.cpd",
    "TileServerUrl": null,                          ← no tile server — all local
    "CacheDir": "C:\\TXX\\Cache\\Tiles",
    "ClassifiedLayerSource": "C:\\TXX\\Classified\\layers.cpd"
  }
}
```

**Feature layers**:
- All Y-level operational layers (same entities, now with classified data included)
- R-only classified layers from `ClassifiedLayerSource`: additional entity types, classified zones, sensitive overlays
- Layer visibility controlled by user role: `R.Classified.Viewer` required to see classified layers (enforced by `AuthorizationBehavior`)

**Offline tile pack**: Part of the Y→R transfer bundle, shipped as a compressed tile archive:
```
TXX-y-transfer-v1.2.3/
├── tiles/
│   ├── txx-r-base-tiles-v1.2.3.tilepkg    ← compressed tile cache
│   └── TILES-CHECKSUMS.sha256
```

R installs the tile pack to `C:\TXX\Cache\Tiles\` during the transfer unpack step. Checksums verified before installation. Carmenta reads from this local cache exclusively — no network requests.

---

## Domain Events → Map Updates

Live map updates are event-driven. Slice domain events are handled by map handlers in `MapTracking`:

```csharp
// Txx.Features/MapTracking/Handlers/
public class AssetPositionUpdatedMapHandler
    : INotificationHandler<AssetPositionUpdatedEvent>
{
    private readonly IMapService _map;

    public async Task Handle(AssetPositionUpdatedEvent e, CancellationToken ct)
    {
        await _map.UpdateOverlayAsync(e.AssetId.ToString(), new MapOverlay
        {
            Id = e.AssetId.ToString(),
            Position = new GeoPoint(e.Longitude, e.Latitude),
            Label = e.CallSign,
            Style = MapOverlayStyle.Asset
        }, ct);
    }
}
```

This handler runs at all levels. At G, `IMapService` is the mock — it stores the overlay in memory and the `MockMapCanvas` re-renders. At Y/R, Carmenta updates the live map display.

---

## Map Configuration Model

All map configuration is typed and validated at startup:

```csharp
public class MapConfig
{
    public string MapDefinitionPath { get; set; } = string.Empty;
    public string? TileServerUrl { get; set; }
    public string CacheDir { get; set; } = string.Empty;
    public string? ClassifiedLayerSource { get; set; }
    public BoundingBox DefaultExtent { get; set; } = BoundingBox.World;
    public int DefaultZoomLevel { get; set; } = 10;

    public static MapConfig Default => new() { DefaultExtent = BoundingBox.World };
}
```

`IOptions<MapConfig>` is injected into `CarmentaMapService`. At G level, `MapConfig.Default` is used by `MockMapService` (no paths needed).
