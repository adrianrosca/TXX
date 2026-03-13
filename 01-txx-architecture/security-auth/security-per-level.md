# Security Per Level

## Summary Table

| Concern | G | Y | R |
|---------|---|---|---|
| Identity provider | Mock (hardcoded users) | AD / OIDC | Windows auth (domain) |
| Token storage | In-memory | In-memory | N/A (Windows auth, no tokens) |
| Session timeout | None | 8h + silent refresh | Windows session (OS-managed) |
| Data encryption at rest | None (dev data) | SQL Server TDE | TDE + volume encryption + Always Encrypted (classified columns) |
| Data encryption in transit | Dev HTTPS cert (optional) | Valid internal TLS cert | Internal TLS (air-gapped CA) |
| Audit log | Console / debug output | Centralized log server (Splunk / ELK) | Local append-only encrypted audit log |
| Secret management | `appsettings.G.json` (no real secrets) | Environment variables / Key Vault | Local encrypted secrets file |
| Network | Localhost / dev LAN | Y internal network only | Air-gapped R network |
| Data loss prevention | N/A | Approved DLP tooling | No removable media; DLP monitoring |

---

## G Level

No real security controls are applied at G. The environment is a developer workstation with internet access. Mock data only.

- `appsettings.G.json` may contain fake connection strings — they are committed to the G repo
- No secrets handling infrastructure required
- HTTPS is optional for local development (Kestrel dev cert)
- All code paths exercised with mock authentication — no bypassing of authorization checks even in G. Authorization must work at G because G tests validate it.

---

## Y Level

### Secret Management

Y secrets (DB connection strings, IdP client secrets, API keys for approved services) are stored in environment variables on the Y CI/CD server and as application configuration on Y workstations:

```csharp
// ISecretsProvider implementation for Y:
public class EnvironmentSecretsProvider : ISecretsProvider
{
    public string GetSecret(string key)
    {
        var value = Environment.GetEnvironmentVariable($"TXX_{key.ToUpperInvariant()}");
        if (value is null)
            throw new SecretNotFoundException(key);
        return value;
    }
}
```

For environments where a Key Vault is available on the Y network, `KeyVaultSecretsProvider` replaces this. The interface is the same — the composition root chooses the implementation.

### Audit Logging

Every command execution and authorization failure is written to a structured log via Serilog with a centralized sink:

```csharp
// Serilog configuration for Y (in AddYServices)
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.Seq("http://audit-log.internal.y/")    // or Elasticsearch / Splunk
    .Enrich.With<UserEnricher>()                    // attaches UserId, UserName, Level
    .CreateLogger();
```

The `UserEnricher` reads from `ICurrentUser` and attaches user context to every log event. Audit events (command executions, auth failures, data access) use log level `Information` with event IDs for easy filtering.

### Network Security

- All TXX traffic on Y network uses TLS with a valid internal certificate from the organization's CA
- No external network access for the TXX application (all external dependencies go through approved internal proxies)
- Database connections use SQL Server Windows Integrated Authentication — no password in connection strings

---

## R Level

### Secret Management

R has no Key Vault and no network secrets service. Secrets are stored in a locally encrypted file, unlocked by a machine-specific key derived from the Windows DPAPI:

```csharp
// ISecretsProvider implementation for R:
public class DpapiSecretsProvider : ISecretsProvider
{
    private readonly Lazy<Dictionary<string, string>> _secrets;

    public DpapiSecretsProvider(IConfiguration config)
    {
        _secrets = new Lazy<Dictionary<string, string>>(() =>
        {
            var encryptedPath = config["Secrets:FilePath"];
            var encryptedBytes = File.ReadAllBytes(encryptedPath);
            var decryptedBytes = ProtectedData.Unprotect(
                encryptedBytes, null, DataProtectionScope.LocalMachine);
            return JsonSerializer.Deserialize<Dictionary<string, string>>(decryptedBytes)!;
        });
    }

    public string GetSecret(string key)
    {
        if (_secrets.Value.TryGetValue(key, out var value)) return value;
        throw new SecretNotFoundException(key);
    }
}
```

The secrets file is generated during the R environment setup process and is not part of the transfer bundle — it is generated on the R machine using the machine's DPAPI key.

### Audit Logging

R audit logs are written to a local, append-only encrypted file. No network sink is possible (air-gapped):

```csharp
// Serilog configuration for R
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File(
        path: @"C:\TXX\Audit\audit-.log",
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 365,
        hooks: new AuditLogHooks()    // custom hook: encrypts each line with DPAPI
    )
    .Enrich.With<UserEnricher>()
    .CreateLogger();
```

Audit log files are retained for 365 days. They are read-only to all users except the local audit service account. Deletion or modification of audit log files triggers a system alert.

### Data Encryption

R-level database encryption layers:

1. **SQL Server TDE** — database files encrypted at rest. Transparent to the application.
2. **Volume encryption** — the server disk volume is encrypted (BitLocker or equivalent). Prevents offline data extraction.
3. **Always Encrypted for classified columns** — specific sensitive columns (`ClassifiedObjective`, `ClassifiedCoordinates`, etc.) use SQL Server Always Encrypted. The encryption key never leaves the application — the database server cannot read these columns in plaintext. Key is stored in the `DpapiSecretsProvider`.

### Physical Security

- R servers are in a physically secured, access-controlled environment
- No removable media (USB drives disabled at OS level via GPO)
- All developer workstations on R network are locked when unattended (GPO-enforced 10-minute screen lock)
- Session logging: all interactive sessions on R servers are recorded

### Transfer Security

When the Y→R transfer bundle arrives on the R network:
1. Bundle is delivered via approved physical media (encrypted USB with hardware authentication)
2. Checksums from the bundle manifest are verified before any file is unpacked
3. A dedicated transfer service account performs unpacking — application service accounts have no access to the transfer directory
4. After successful verification, the transfer service account hands off to the deployment pipeline

The application itself has no involvement in the transfer process and cannot initiate outbound connections.
