# EF Strategy

## DbContext Design

TXX uses a single `TxxDbContext` as the main context, with a `TxxDbContextBase` providing shared configuration. Level-specific contexts are not separate contexts — they are the same context with level-specific configurations applied.

```
TxxDbContextBase           ← abstract, shared config, interceptors, soft delete filter
    └── TxxDbContext       ← production context, all DbSets
```

Why a single context: EF migrations work cleanly with one context. Multiple DbContexts across a single database cause migration conflicts and complicate transaction management. The GYR model differentiates behavior through query filters and configuration, not separate contexts.

### TxxDbContextBase

```csharp
public abstract class TxxDbContextBase : DbContext
{
    private readonly ICurrentUser _currentUser;

    protected TxxDbContextBase(DbContextOptions options, ICurrentUser currentUser)
        : base(options)
    {
        _currentUser = currentUser;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Apply all configurations from the assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TxxDbContext).Assembly);

        // Global query filter: soft deletes — never returns deleted records
        modelBuilder.Model.GetEntityTypes()
            .Where(t => typeof(ISoftDeletable).IsAssignableFrom(t.ClrType))
            .ToList()
            .ForEach(t => modelBuilder.Entity(t.ClrType)
                .HasQueryFilter(BuildSoftDeleteFilter(t.ClrType)));
    }

    // Interceptor: populate audit fields on SaveChanges
    public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<EntityBase>()
            .Where(e => e.State is EntityState.Added or EntityState.Modified))
        {
            if (entry.State == EntityState.Added)
                entry.Entity.SetCreatedBy(_currentUser.UserName);
            else
                entry.Entity.SetModifiedAt(DateTime.UtcNow);
        }
        return await base.SaveChangesAsync(ct);
    }
}
```

### TxxDbContext

```csharp
public class TxxDbContext : TxxDbContextBase
{
    public TxxDbContext(DbContextOptions<TxxDbContext> options, ICurrentUser currentUser)
        : base(options, currentUser) { }

    // Core entities (all levels)
    public DbSet<Mission> Missions => Set<Mission>();
    public DbSet<Personnel> Personnel => Set<Personnel>();
    public DbSet<MapTrack> MapTracks => Set<MapTrack>();

    // Y-level entities (included in schema but empty at G — no data)
    public DbSet<OperationalReport> OperationalReports => Set<OperationalReport>();

    // R-level entities (included in schema — guarded by row-level security at DB)
    public DbSet<ClassifiedIntel> ClassifiedIntel => Set<ClassifiedIntel>();
}
```

All entities live in the same schema but R-level entities are empty at G (in-memory DB has no data there) and protected by database-level row security at Y and R.

---

## Entity Configuration

Each entity has a dedicated `IEntityTypeConfiguration<T>` class. These live alongside the entity in the slice folder:

```
Txx.Features/Missions/Infrastructure/
├── MissionRepository.cs
└── MissionEntityConfiguration.cs      ← implements IEntityTypeConfiguration<Mission>
```

```csharp
public class MissionEntityConfiguration : IEntityTypeConfiguration<Mission>
{
    public void Configure(EntityTypeBuilder<Mission> builder)
    {
        builder.ToTable("Missions");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Name).HasMaxLength(100).IsRequired();
        builder.Property(m => m.Status).HasConversion<string>();

        // Index for common queries
        builder.HasIndex(m => m.Status);
        builder.HasIndex(m => new { m.CreatedAt, m.Status });
    }
}
```

`ApplyConfigurationsFromAssembly` in `OnModelCreating` discovers all configurations automatically — no manual registration needed.

---

## G-Level Database (In-Memory / SQLite)

At G level, EF is configured to use an in-memory provider during tests and a file-based SQLite during development:

```csharp
// appsettings.G.json
{
  "Database": {
    "Provider": "Sqlite",
    "ConnectionString": "Data Source=txx-dev.db"
  }
}

// Txx.Infrastructure.Mock — AddMockServices()
services.AddDbContext<TxxDbContext>((sp, options) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var provider = config["Database:Provider"];

    if (provider == "InMemory")
        options.UseInMemoryDatabase("TxxG");
    else
        options.UseSqlite(config["Database:ConnectionString"]);
});
```

Tests always use `UseInMemoryDatabase` with a unique name per test class to ensure isolation.

---

## Y and R Level Databases

```csharp
// Txx.Infrastructure.Y — AddYServices()
services.Replace(ServiceDescriptor.Scoped<TxxDbContext>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var optionsBuilder = new DbContextOptionsBuilder<TxxDbContext>();
    optionsBuilder.UseSqlServer(config["Database:ConnectionString"]);
    return new TxxDbContext(optionsBuilder.Options, sp.GetRequiredService<ICurrentUser>());
}));
```

Configuration comes from `appsettings.Y.json` (Y level) or `appsettings.R.json` (R level) — never hardcoded.

---

## Migrations

Migrations are managed in a single migration project, `Txx.Infrastructure.Migrations`, that targets `TxxDbContext`:

```
Txx.Infrastructure.Migrations/
├── Migrations/
│   ├── 20260101_InitialCreate.cs
│   ├── 20260115_AddMissionStatus.cs
│   └── ...
└── MigrationDbContextFactory.cs    ← design-time factory for EF tools
```

**Migration strategy per level:**

| Level | When migrations run | How |
|-------|--------------------|----|
| G | Automatically on startup (`MigrateAsync`) | SQLite dev DB, safe to auto-migrate |
| Y | Manually by DBA, reviewed before apply | `dotnet ef database update` on Y server |
| R | Manually by DBA, part of transfer bundle | Migration SQL scripts shipped in transfer; DBA applies after review |

At Y and R, automatic migration on startup is **disabled**. The app will fail to start if the DB schema doesn't match — forcing an explicit DBA step.

```csharp
// Startup check for Y/R (replaces auto-migrate)
var pending = await db.Database.GetPendingMigrationsAsync();
if (pending.Any())
    throw new InvalidOperationException(
        $"Database has {pending.Count()} pending migrations. " +
        "Contact the DBA to apply migrations before starting the application.");
```
