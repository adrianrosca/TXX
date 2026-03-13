---
name: ssh
description: SSH into any server and run commands
---

## Summary

- SSH into alphanode2 server using encrypted SSH keys from dp-brain secrets in alphanode2
- Server inventory: ps-stage/prod, p2-stage/prod, dp-stage, cb-prod, etc.
- Common ops: PM2 status/logs/restart, disk, memory, health check

## Usage

When user invokes `/ssh`, ask these questions using AskUserQuestion (unless already specified):

### Question 1: Which server?

Refer to the server inventory below. Accept server name, alias, or IP.

### Question 2: What to do?

- interactive session
- run a specific command
- check status (pm2, disk, memory, logs)

## Server inventory

See `servers/SKILL.md` for the full inventory with specs, roles, and PM2 apps.

| Name | IP | User | Dir | PM2 | SSH Key |
|------|-----|------|-----|-----|---------|
| ps-stage | 16.170.221.123 | ubuntu | /opt/apps/ps-v2-stage/dp-server-2 | ps-v2-stage | STAGE_EC2_SSH_KEY |
| ps-prod | 46.246.46.191 | adrian | /home/adrian/pawn-system/dp-server-2 | admin-ps | PROD_GLESYS_SSH_KEY |
| p2-stage | 51.20.213.188 | ubuntu | /opt/apps/p2-v2-stage | p2-admin-stage | STAGE_EC2_SSH_KEY |
| p2-legacy-stage | 16.170.50.120 | ubuntu | — | dp-server | STAGE_EC2_SSH_KEY |
| p2-prod | 13.50.94.20 | ubuntu | /home/ubuntu/dp | dp-server | STAGE_EC2_SSH_KEY |
| dp-stage | 51.20.213.188 | ubuntu | /home/ubuntu | (pm2 list) | STAGE_EC2_SSH_KEY |
| cb-prod | 13.48.200.72 | ubuntu | /home/ubuntu | — | CB_SSH_KEY |
| dp-app | 13.49.11.108 | ubuntu | — | dp-server | STAGE_EC2_SSH_KEY |
| dp-jobs | 13.50.229.84 | ubuntu | — | job | STAGE_EC2_SSH_KEY |
| stage.digitalplattform.dev | 13.62.201.3 | ubuntu | — | fb-stage, p2-collect | STAGE_EC2_SSH_KEY |

### wp servers

| Name | IP | User | SSH Key |
|------|-----|------|---------|
| ps-stage | 16.170.221.123 | ubuntu | STAGE_EC2_SSH_KEY |
| ps-prod | 46.246.46.191 | adrian | PROD_GLESYS_SSH_KEY |
| p2-stage / dp-stage | 51.20.213.188 | ubuntu | STAGE_EC2_SSH_KEY |
| p2-legacy-stage | 16.170.50.120 | ubuntu | STAGE_EC2_SSH_KEY |
| p2-prod / pop | 13.50.94.20 | ubuntu | STAGE_EC2_SSH_KEY |
| dp-app | 13.49.11.108 | ubuntu | STAGE_EC2_SSH_KEY |
| dp-jobs | 13.50.229.84 | ubuntu | STAGE_EC2_SSH_KEY |
| stage.digitalplattform.dev | 13.62.201.3 | ubuntu | STAGE_EC2_SSH_KEY |
| dp-vpn | 13.51.226.223 | ubuntu | STAGE_EC2_SSH_KEY |
| cb-prod | 13.48.200.72 | ubuntu | CB_SSH_KEY |
| alphanode2 | 13.51.91.179 | ubuntu | SSH_PRIVATE_KEY_RSA (wp/prod) | port 2222 |

All AWS servers are in `eu-north-1` (Stockholm).

## Connecting

### Step 1: Resolve SSH key

All secrets are managed via dp-tools. Use multiline-safe extraction:
```bash
# alphanode2 (wp/prod):
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts get wp prod SSH_PRIVATE_KEY_RSA > /tmp/dp_ssh_key && chmod 600 /tmp/dp_ssh_key

# other servers (ps/prod for STAGE_EC2_SSH_KEY, etc.):
cd /c/Adrian/Code/dp && DECRYPT_KEY=<password> npx tsx dp-tools/src/secrets/cli.ts get <system> <env> <KEY> > /tmp/dp_ssh_key && chmod 600 /tmp/dp_ssh_key
```

### Step 2: Validate key

```bash
ssh-keygen -l -f /tmp/dp_ssh_key
```

### Step 3: SSH

```bash
ssh -i /tmp/dp_ssh_key <user>@<ip>
# alphanode2 uses port 2222:
ssh -i /tmp/dp_ssh_key -p 2222 ubuntu@13.51.91.179
```

For one-off commands:
```bash
ssh -i /tmp/dp_ssh_key <user>@<ip> "<command>"
```

### Step 4: Cleanup

```bash
rm /tmp/dp_ssh_key
```

## Common operations

Once connected:
- **PM2 status**: `pm2 status` or `pm2 status <name>`
- **PM2 logs**: `pm2 logs <name> --lines 50 --nostream`
- **Restart**: `pm2 restart <name>`
- **Disk**: `df -h`
- **Memory**: `free -h`
- **Health check**: `curl -sf http://localhost:<port>/health`
- **Processes**: `ps aux --sort=-%mem | head -20`
- **Nginx**: `sudo nginx -t && sudo systemctl reload nginx`
