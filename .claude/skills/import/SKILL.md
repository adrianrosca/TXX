---
name: import
description: Import data from a remote MongoDB to localhost
---

## Summary

- Clone databases from remote MongoDB to localhost via interactive CLI
- Prompts for remote URI and database selection
- Run from dp-tools with 10 min timeout for large datasets

## Usage

When user invokes `/import`, run the interactive CLI:

```bash
cd /c/Adrian/Code/dp/dp-tools && npx tsx src/import/cli.ts
```

The CLI prompts for:
1. Remote MongoDB URI
2. Database selection (from discovered databases)

Then clones selected databases to `localhost:27017`.

Use a 10 minute timeout — large datasets take time.
