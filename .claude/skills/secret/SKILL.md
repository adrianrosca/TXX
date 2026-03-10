---
name: secret
description: Manage encrypted secret blobs for system deployments
---

## Summary

- Get/set/rotate encrypted secrets per system (ps, p2, fb, etc.) and env (stage/prod)
- RSA-4096 + AES-256-GCM hybrid encryption, blobs committed to repo
- CLI: `npx tsx dp-tools/src/secrets/cli.ts [get|set|init|rotate|edit]`

## Usage

### secret set

When user says "secret set" or "secret add", ask 5 questions using AskUserQuestion (all in one call):

1. **Which system?** — ps, fb, mp, up, p2, ds, dp, dd, cb
2. **Which env?** — stage, prod, or both
3. **Key?** — the secret key name (e.g. JWT_SECRET, MONGO_URI)
4. **Value?** — the secret value
5. **Decrypt password?** — ask as free-text input (no predefined options, just "Other" so user types the password)

Then run for the selected env(s):
```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts set <system> <env> <KEY> <VALUE>
```

### secret get

When user says "secret get", "secret value", or "secrets value", ask 3 questions using AskUserQuestion (all in one call):

1. **Which system?** — ps, fb, mp, up, p2, ds, dp, dd, cb
2. **Which key?** — the secret key name (e.g. JWT_SECRET, MONGO_URI)
3. **Decrypt password?** — ask as free-text input (no predefined options, just "Other" so user types the password)

Then run for both envs and show the values:
```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts get <system> stage <KEY>
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts get <system> prod <KEY>
```

### secret values

When user says "secret values", ask 2 questions using AskUserQuestion (all in one call):

1. **Which system?** — ps, fb, mp, up, p2, ds, dp, dd, cb
2. **Decrypt password?** — ask as free-text input (no predefined options, just "Other" so user types the password)

Then run for both envs and show all key=value pairs:
```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts get <system> stage
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts get <system> prod
```

Display output as:
```
**stage:**
key_a=value_x
key_b=value_y

**prod:**
key_a=value_x
key_b=value_y
```

If user provides args like `/secrets init`, `/secrets get`, `/secrets rotate`, etc. — use the operation flows below instead.

## Other operations

### init
Ask: system, password.
```bash
cd /c/Adrian/Code/dp && npx tsx dp-tools/src/secrets/cli.ts init <system> <password>
```
Remind user to set `DECRYPT_KEY=<password>` in GitHub secrets and locally.

### get
Ask: system, env, optional key.
```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY=$DECRYPT_KEY npx tsx dp-tools/src/secrets/cli.ts get <system> <env> [KEY]
```

### import-env
Ask: system, env, path to .env file.
```bash
cd /c/Adrian/Code/dp && npx tsx dp-tools/src/secrets/cli.ts import-env <system> <env> <file>
```

### export-env
Ask: system, env.
```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY=$DECRYPT_KEY npx tsx dp-tools/src/secrets/cli.ts export-env <system> <env>
```

### edit
Ask: system, env.
```bash
cd /c/Adrian/Code/dp && DECRYPT_KEY=$DECRYPT_KEY npx tsx dp-tools/src/secrets/cli.ts edit <system> <env>
```

### rotate
Ask: system, old password, new password.
```bash
cd /c/Adrian/Code/dp && npx tsx dp-tools/src/secrets/cli.ts rotate <system> <old-password> <new-password>
```
Remind user to update `DECRYPT_KEY` in GitHub secrets and locally.

## Architecture

- **Tooling**: `dp-tools/src/secrets/` — CLI, fn/, type/
- **Blobs**: `dp-brain/secrets/<system>/<alias>-<env>.secrets.enc` — one per system+env, flat `Record<string, string>`, committed to repo
- **Keys**: `dp-brain/secrets/<system>/public.pem` + `private.pem.enc` — per-system keypair
- **Encryption**: RSA-4096 + AES-256-GCM hybrid. Private key protected by scrypt-derived password.
- **Deploy integration**: `dp-tools/src/deploy/deploy.ts` decrypts blobs at deploy time to generate `.env`

## Systems

| Alias | Folder | Has blobs |
|-------|--------|-----------|
| ps | pawn-system | stage, prod |
| p2 | p2-pop | stage, prod |
| dp | dp-platform | stage |
| cb | closebuy | prod |
| dd | dp-docs | stage |
| wp | wp-bot | prod |
| fb | franska-bukten | — |
| mp | management-planner | — |
| up | universal-power | — |
| ds | dp-story | — |
| gd | google-drive | prod |
| pm | postmark | prod |

## Environments
stage, prod
