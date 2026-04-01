# Repository Pattern

## Interface Contracts (Txx.Core)

```csharp
// Write side — used by command handlers
public interface IRepository<T> where T : EntityBase
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default);
    Task AddAsync(T entity, CancellationToken ct = default);
    void Update(T entity);
    void Delete(T entity);
}

// Read side — used by query handlers (no tracking, optimized for reads)
public interface IReadRepository<T> where T : EntityBase
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<T>> FindAsync(ISpecification<T> spec, CancellationToken ct = default);
    Task<int> CountAsync(ISpecification<T> spec, CancellationToken ct = default);
    Task<bool> AnyAsync(ISpecification<T> spec, CancellationToken ct = default);
}

// Transaction management — used by TransactionBehavior in pipeline
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task BeginTransactionAsync(CancellationToken ct = default);
    Task CommitAsync(CancellationToken ct = default);
    Task RollbackAsync(CancellationToken ct = default);
}
```

---

## Generic Implementations (Txx.Infrastructure)

```csharp
public class EfRepository<T> : IRepository<T> where T : EntityBase
{
    protected readonly TxxDbContext _db;
    protected readonly DbSet<T> _set;

    public EfRepository(TxxDbContext db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public Task<T?> GetByIdAsync(Guid id, CancellationToken ct)
        => _set.FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct)
        => await _set.ToListAsync(ct);

    public async Task AddAsync(T entity, CancellationToken ct)
        => await _set.AddAsync(entity, ct);

    public void Update(T entity)
        => _db.Entry(entity).State = EntityState.Modified;

    public void Delete(T entity)
    {
        if (entity is ISoftDeletable sd)
        {
            sd.IsDeleted = true;
            sd.DeletedAt = DateTime.UtcNow;
            Update(entity);          // soft delete
        }
        else
            _set.Remove(entity);     // hard delete
    }
}

public class EfReadRepository<T> : IReadRepository<T> where T : EntityBase
{
    private readonly TxxDbContext _db;

    public EfReadRepository(TxxDbContext db) => _db = db;

    public Task<T?> GetByIdAsync(Guid id, CancellationToken ct)
        => _db.Set<T>().AsNoTracking().FirstOrDefaultAsync(e => e.Id == id, ct);

    public async Task<IReadOnlyList<T>> FindAsync(ISpecification<T> spec, CancellationToken ct)
        => await ApplySpec(_db.Set<T>().AsNoTracking(), spec).ToListAsync(ct);

    // ...
}
```

These generics are registered once and cover every entity automatically:

```csharp
// AddCoreServices() in Txx.Infrastructure:
services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));
services.AddScoped(typeof(IReadRepository<>), typeof(EfReadRepository<>));
services.AddScoped<IUnitOfWork, EfUnitOfWork>();
```

---

## Specification Pattern

Specifications encapsulate query logic in a reusable, testable object. They are the only way to add filtering/sorting/paging to a read query.

```csharp
public interface ISpecification<T>
{
    Expression<Func<T, bool>>? Criteria { get; }
    List<Expression<Func<T, object>>> Includes { get; }
    Expression<Func<T, object>>? OrderBy { get; }
    Expression<Func<T, object>>? OrderByDescending { get; }
    int? Skip { get; }
    int? Take { get; }
}
```

### Example: query handler using a spec

```csharp
// Txx.Features/Missions/Queries/GetMissionList.cs
public class GetMissionList
{
    public record Query(MissionStatus? StatusFilter, string? Cursor, int PageSize = 50)
        : IRequest<Result>;

    public record Result(IReadOnlyList<MissionSummary> Missions, string? NextCursor, int TotalCount);

    public class Handler : IRequestHandler<Query, Result>
    {
        private readonly IReadRepository<Mission> _repo;

        public Handler(IReadRepository<Mission> repo) => _repo = repo;

        public async Task<Result> Handle(Query q, CancellationToken ct)
        {
            var spec = new ActiveMissionsSpec(q.StatusFilter, q.Cursor, q.PageSize);
            var missions = await _repo.FindAsync(spec, ct);
            var total = await _repo.CountAsync(new ActiveMissionsSpec(q.StatusFilter), ct);

            var next = missions.Count == q.PageSize ? missions.Last().Id.ToString() : null;
            return new Result(missions.Select(MissionSummary.From).ToList(), next, total);
        }
    }
}

// Specification lives alongside the query:
public class ActiveMissionsSpec : BaseSpecification<Mission>
{
    public ActiveMissionsSpec(MissionStatus? status, string? cursor = null, int? take = null)
    {
        if (status.HasValue) AddCriteria(m => m.Status == status.Value);
        if (cursor != null) AddCriteria(m => string.Compare(m.Id.ToString(), cursor) > 0);
        AddOrderBy(m => m.CreatedAt);
        if (take.HasValue) Take = take.Value;
    }
}
```

### Benefits
- Query logic is tested independently of the handler and ViewModel
- The generic `IReadRepository<T>` never needs to know about specific queries
- Same spec can be reused in multiple handlers or queries

---

## Slice-Specific Repository Extensions

When a query is complex enough that the specification pattern becomes unwieldy (e.g., multi-join reports), a slice-specific repository interface is acceptable:

```csharp
// Txx.Core/Contracts/IMissionReportRepository.cs
public interface IMissionReportRepository
{
    Task<MissionReportRow[]> GetCompletedMissionsForPeriodAsync(
        DateRange period,
        CancellationToken ct = default);
}

// Txx.Features/Reports/Infrastructure/MissionReportRepository.cs
public class MissionReportRepository : IMissionReportRepository
{
    private readonly TxxDbContext _db;

    public async Task<MissionReportRow[]> GetCompletedMissionsForPeriodAsync(
        DateRange period, CancellationToken ct)
    {
        return await _db.Missions
            .Where(m => m.Status == MissionStatus.Completed
                     && m.CompletedAt >= period.Start
                     && m.CompletedAt <= period.End)
            .Select(m => new MissionReportRow { /* ... */ })
            .ToArrayAsync(ct);
    }
}
```

The interface is defined in `Txx.Core.Contracts` — Y/R can replace the implementation with a version that accesses additional classified data while keeping the same contract.

---

## G vs Y/R Repository Differences

Most slices do NOT need level-specific repositories — the generic implementation works across all levels because it reads from the same `TxxDbContext` (which is configured per level).

Level-specific repos are only needed when:
- R-level queries must include classified columns that don't exist in G schema
- Y/R need raw SQL or stored procedures not representable in EF

```csharp
// Txx.Features.R/Missions/Infrastructure/MissionRRepository.cs
public class MissionRRepository : EfRepository<Mission>, IRepository<Mission>
{
    // Inherits all base behavior, adds R-specific classified data access
    public override async Task<Mission?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var mission = await base.GetByIdAsync(id, ct);
        if (mission != null)
            await EnrichWithClassifiedDataAsync(mission, ct);
        return mission;
    }
}
```

Registered in `Txx.Infrastructure.R.AddRServices()` replacing the generic:

```csharp
services.Replace(ServiceDescriptor.Scoped<IRepository<Mission>, MissionRRepository>());
```
