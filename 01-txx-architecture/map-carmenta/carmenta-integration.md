# Carmenta Integration

## IMapService (Txx.Core)

The map contract is defined in `Txx.Core` and covers all map operations needed by the application:

```csharp
public interface IMapService
{
    // Initialization
    Task InitializeAsync(MapConfig config, CancellationToken ct = default);
    bool IsInitialized { get; }

    // Layer management
    Task<string> AddLayerAsync(MapLayerDefinition layer, CancellationToken ct = default);
    Task RemoveLayerAsync(string layerId, CancellationToken ct = default);
    Task SetLayerVisibilityAsync(string layerId, bool visible, CancellationToken ct = default);
    IReadOnlyList<MapLayerInfo> GetActiveLayers();

    // Overlay / marker management
    Task<string> AddOverlayAsync(MapOverlay overlay, CancellationToken ct = default);
    Task UpdateOverlayAsync(string overlayId, MapOverlay updated, CancellationToken ct = default);
    Task RemoveOverlayAsync(string overlayId, CancellationToken ct = default);
    Task ClearOverlaysAsync(CancellationToken ct = default);

    // Navigation
    Task ZoomToExtentAsync(BoundingBox extent, CancellationToken ct = default);
    Task ZoomToPointAsync(GeoPoint point, int zoomLevel, CancellationToken ct = default);
    Task PanToAsync(GeoPoint point, CancellationToken ct = default);
    GeoExtent GetCurrentExtent();

    // Events (observable streams)
    IObservable<MapClickEvent> MapClicks { get; }
    IObservable<MapExtentChangedEvent> ExtentChanges { get; }
    IObservable<MapLayerLoadedEvent> LayerLoads { get; }
}
```

Shared data objects (`MapOverlay`, `BoundingBox`, `GeoPoint`, `MapLayerDefinition`) are value objects defined in `Txx.Core` — no Carmenta types leak outside the implementation.

---

## G-Level: MockMapService

The mock implementation lives in `Txx.Infrastructure.Mock` and provides a functional (non-Carmenta) map experience for G-level development:

```csharp
public class MockMapService : IMapService
{
    private readonly List<MapOverlay> _overlays = new();
    private readonly Subject<MapClickEvent> _clickSubject = new();

    public bool IsInitialized { get; private set; }

    public Task InitializeAsync(MapConfig config, CancellationToken ct = default)
    {
        IsInitialized = true;
        return Task.CompletedTask;
    }

    public Task<string> AddOverlayAsync(MapOverlay overlay, CancellationToken ct = default)
    {
        _overlays.Add(overlay);
        return Task.FromResult(overlay.Id ?? Guid.NewGuid().ToString());
    }

    public IObservable<MapClickEvent> MapClicks => _clickSubject.AsObservable();

    // UI test support: simulate a map click
    public void SimulateClick(GeoPoint point)
        => _clickSubject.OnNext(new MapClickEvent(point));

    // ... other methods return Task.CompletedTask or return empty lists
}
```

The WPF `MapRegionView` at G level renders a static background image (a pre-rendered map tile) with overlays drawn as WPF shapes. This gives designers and developers a realistic map region without Carmenta.

---

## Y/R Level: CarmentaMapService

The real implementation wraps the Carmenta Engine API. It lives in `Txx.Infrastructure.Y` (Y and R share the base implementation; R extends it):

```csharp
public class CarmentaMapService : IMapService, IDisposable
{
    private readonly MapEngine _engine;      // Carmenta Engine instance
    private readonly IConfiguration _config;
    private readonly Subject<MapClickEvent> _clickSubject = new();

    public CarmentaMapService(IConfiguration config)
    {
        _config = config;
        _engine = new MapEngine();
        _engine.MouseClick += OnEngineMouseClick;
    }

    public async Task InitializeAsync(MapConfig config, CancellationToken ct)
    {
        await _engine.LoadMapAsync(_config["Carmenta:MapDefinitionPath"]);
        IsInitialized = true;
    }

    public async Task<string> AddOverlayAsync(MapOverlay overlay, CancellationToken ct)
    {
        var carmentaFeature = MapOverlayAdapter.ToCarmentaFeature(overlay);
        var id = await _engine.AddFeatureAsync(carmentaFeature);
        return id.ToString();
    }

    private void OnEngineMouseClick(object sender, CarmentaMouseEventArgs e)
        => _clickSubject.OnNext(new MapClickEvent(
               new GeoPoint(e.Longitude, e.Latitude)));

    public IObservable<MapClickEvent> MapClicks => _clickSubject.AsObservable();

    public void Dispose() => _engine.Dispose();
}
```

`MapOverlayAdapter` (a private adapter class) handles all Carmenta type conversions. It is the only place in the codebase that knows about Carmenta-specific types.

### R Extension

R adds classified layers on top of the Y base implementation:

```csharp
// Txx.Infrastructure.R
public class CarmentaRMapService : CarmentaMapService
{
    private readonly IClassifiedLayerSource _classifiedSource;

    public CarmentaRMapService(IConfiguration config, IClassifiedLayerSource classifiedSource)
        : base(config)
    {
        _classifiedSource = classifiedSource;
    }

    public override async Task InitializeAsync(MapConfig config, CancellationToken ct)
    {
        await base.InitializeAsync(config, ct);
        await LoadClassifiedLayersAsync(ct);
    }

    private async Task LoadClassifiedLayersAsync(CancellationToken ct)
    {
        var classifiedLayers = await _classifiedSource.GetAvailableLayersAsync(ct);
        foreach (var layer in classifiedLayers)
            await AddLayerAsync(layer, ct);
    }
}
```

---

## WPF Map Region View

The `MapRegionView` is the WPF UserControl that hosts the Carmenta Engine control. It is registered into `MAP_REGION` by the `MapTrackingModule`.

At G level, `MapRegionView` displays a `MockMapCanvas` (a custom WPF panel rendering overlays as shapes). At Y/R level, it hosts the actual `CarmentaMapControl` (a Carmenta-provided WPF element).

The ViewModel (`MapTrackingViewModel`) is identical across levels — it calls `IMapService` and never references the concrete WPF control type.

```csharp
public partial class MapTrackingViewModel : TxxViewModelBase
{
    private readonly IMapService _map;
    private readonly IMediator _mediator;

    public MapTrackingViewModel(IMapService map, IMediator mediator)
    {
        _map = map;
        _mediator = mediator;
    }

    public override async void OnNavigatedTo(NavigationContext ctx)
    {
        if (!_map.IsInitialized)
            await _map.InitializeAsync(MapConfig.Default);

        // Subscribe to map clicks for geo-context actions
        _map.MapClicks
            .ObserveOn(SynchronizationContext.Current!)
            .Subscribe(OnMapClick);

        await LoadActiveTracksAsync();
    }
}
```

---

## Carmenta License Management

- **G level**: Carmenta license not required. MockMapService is used.
- **Y level**: Carmenta Engine installed from approved internal package feed. License file at `%APPDATA%\Carmenta\license.key` (path configured in `appsettings.Y.json`).
- **R level**: Carmenta Engine and license files travel in the Y→R transfer bundle. License files are stored in the R environment's secrets store (see [Security & Auth](../security-auth/security-per-level.md)).
