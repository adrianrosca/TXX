# Database Per Level

## Summary

| Level | Engine | Location | Auto-migrate | Seed data |
|-------|--------|----------|-------------|-----------|
| G | SQLite (dev) / In-memory (tests) | Local machine | Yes | Mock seed data |
| Y | SQL Server or PostgreSQL | Y-network internal server | No (DBA) | Real operational data |
| R | SQL Server | Air-gapped R-network server | No (DBA) | Real + classified data |

---

## G Level — SQLite / In-Memory

**Purpose**: Developer experience. Fast iteration, no server required.

```json
// appsettings.G.json
{
  "Database": {
    "Provider": "Sqlite",
    "ConnectionString": "Data Source=txx-dev.db;Cache=Shared",
    "AutoMigrate": true
  }
}
```

For unit and integration tests, `UseInMemoryDatabase` is used with a unique name per test class:

```csharp
public static DbContextOptions<TxxDbContext> CreateTestOptions(string dbName)
    => new DbContextOptionsBuilder<TxxDbContext>()
        .UseInMemoryDatabase(dbName)
        .Options;
```

Tests never touch the file-based SQLite — they run fully in-memory, in parallel, with no shared state.

**Seed data**: `ITxxDataSeeder` implementations in `Txx.Infrastructure.Mock` populate the DB on first startup with realistic-looking mock data across all entities. Seeds cover the full range of entity states and edge cases to support comprehensive UI testing at G level.

```csharp
public interface ITxxDataSeeder
{
    int Order { get; }                   // Run order (lower = earlier)
    Task SeedAsync(TxxDbContext db, CancellationToken ct);
}

// Discovery and execution at G startup:
var seeders = sp.GetServices<ITxxDataSeeder>().OrderBy(s => s.Order);
foreach (var seeder in seeders)
    await seeder.SeedAsync(db, ct);
```

---

## Y Level — SQL Server / PostgreSQL

**Purpose**: Real operational data with approved external connectivity.

```json
// appsettings.Y.json
{
  "Database": {
    "Provider": "SqlServer",
    "ConnectionString": "Server=txx-sql.internal;Database=TxxY;Integrated Security=true;",
    "AutoMigrate": false
  }
}
```

**Migration workflow**:
1. Developer creates migration: `dotnet ef migrations add <name> --project Txx.Infrastructure.Migrations`
2. Migration is reviewed in code review (same Y-security sign-off as feature code)
3. DBA reviews generated SQL: `dotnet ef migrations script --idempotent`
4. DBA applies to Y database in a maintenance window
5. Application is restarted; startup check validates no pending migrations remain

**Backup**: Daily full backup + transaction log backups every 15 minutes. Retention: 30 days.

---

## R Level — SQL Server (Air-Gapped)

**Purpose**: Full operational + classified data. No external connectivity.

```json
// appsettings.R.json
{
  "Database": {
    "Provider": "SqlServer",
    "ConnectionString": "Server=txx-r-sql.r.internal;Database=TxxR;Integrated Security=true;",
    "AutoMigrate": false
  }
}
```

**Migration workflow** (through air-gap):
1. Migration created and reviewed at Y level (as part of normal Y workflow)
2. The idempotent migration SQL script is included in the Y→R transfer bundle:
   ```
   TXX-y-transfer-v1.2.3/
   ├── db-migrations/
   │   ├── V1.2.3-migration.sql      ← idempotent, reviewed by Y DBA
   │   └── MIGRATION-NOTES.md        ← what changed and why
   ```
3. R DBA reviews migration SQL before applying (second review — R-specific concerns)
4. R DBA applies migration, verifies row counts and data integrity
5. Application is deployed after DB migration is confirmed

**Classified columns**: R-level entities have additional columns not present in Y's physical schema. These are added by R-specific migrations that run after the standard Y migrations:

```
Y migrations run first:  Missions table with base columns
R-only migration runs:   ALTER TABLE Missions ADD ClassifiedObjective NVARCHAR(MAX) ENCRYPTED
```

**Data encryption**: R database uses SQL Server TDE (Transparent Data Encryption) at the DB level, plus volume-level encryption on the server. Classified columns additionally use Always Encrypted.

**Backup**: Daily full backup to encrypted local media. No cloud or network backup targets.

---

## Schema Evolution Rules

To ensure G migrations remain valid at Y and R:

1. **Additive only**: Migrations may add columns, tables, and indexes. Never remove or rename in a Y/R-bound migration.
2. **Non-breaking defaults**: New non-nullable columns must have a default value for existing rows.
3. **Two-phase removals**: Columns to be removed must first be deprecated (marked in code, unused) for one full release cycle, then removed in a second migration.
4. **R-only additions**: Classified columns are in R-only migrations. They must be nullable or have a default so Y can run the base schema without them.

---

## Local Dev Data Reset

During G development, the SQLite database can be reset and reseeded:

```bash
# Delete the local DB file and let it recreate with seeds on next startup
rm txx-dev.db

# Or use the CLI tool included in the solution:
dotnet run --project tools/Txx.DevTools -- db:reset --seed
```

The dev tools project is G-only and is never included in Y or R builds.
