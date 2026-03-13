---
name: servers
description: Full inventory of all AWS EC2 servers with specs, roles, and PM2 apps
---

## Summary

All servers run on AWS EC2 in `eu-north-1` (Stockholm), except `ps-prod` (Glesys). SSH via `ubuntu` user with the AWS RSA key pair, or `adrian` for ps-prod.

## Quick Reference

| Name | IP | Instance | vCPU | RAM | Disk | OS | Role |
|------|-----|----------|------|-----|------|----|------|
| ps-stage | 16.170.221.123 | t3.medium | 2 | 4G | 29G (65%) | Ubuntu 24.04 | PS Admin Stage — PM2 + Docker (MongoDB, MySQL 5.7) + Apache (PHP 5.6) |
| ps-prod | 46.246.46.191 | Glesys | — | — | — | — | PS Admin Prod — Glesys VPS |
| p2-stage / p2.digitalplattform.dev | 16.170.50.120 | t3.small | 2 | 2G | 39G (55%) | Ubuntu 20.04 | P2 staging — PM2 (p2-admin-stage port 4000) + GH Actions runner |
| p2-prod / pop.p2ab.se | 13.50.94.20 | t3.medium | 2 | 4G | 39G (59%) | Ubuntu 20.04 | DP pop — 1 active PM2 (dp-server), 8 stopped |
| dp-app / app.digitalplattform.se | 13.49.11.108 | t3.small | 2 | 2G | 49G (64%) | Ubuntu 20.04 | Main DP app — 9 PM2 Node services |
| dp-jobs / jobs.p2.se | 13.50.229.84 | t3.small | 2 | 2G | 175G (59%) | Ubuntu 20.04 | Background job processor — PM2 + vsftpd |
| stage.digitalplattform.dev | 13.62.201.3 | t3.small | 2 | 2G | 29G (14%) | Ubuntu 24.04 | DP staging — fb-stage (4001), p2-stage (4002), mp-stage (4003), upn-stage (4004), dp-docs (4005) |
| dp-vpn | 13.51.226.223 | t3.nano | 2 | 416M | 7G (39%) | Ubuntu 24.04 | NetBird VPN gateway |
| cb-prod | 13.48.200.72 | t3.nano | 2 | 0.5G | — | — | closebuy.se — DIFFERENT SSH key |
| alphanode2 | 13.51.91.179 | m7i-flex.large | 2 | 8G | 193G (30%) | Ubuntu 24.04 | WordPress host — ~31 WP sites, MariaDB, nginx, PHP 7.1/7.4/8.1 |
| alphanode (old) | — | m6i.xlarge | — | — | — | — | STOPPED — old Plesk server, kept for EBS |

## SSH Keys

| Key | Secret name | Used for |
|-----|-------------|----------|
| AWS RSA (DP-KeyPair.pem) | `SSH_PRIVATE_KEY_RSA` in `wp/prod` | All AWS servers including alphanode2 |
| CB key | `CB_SSH_KEY` | closebuy.se (different key, unknown origin) |
| Glesys key | `PROD_GLESYS_SSH_KEY` | ps-prod (user: `adrian`) |

See `ssh/SKILL.md` for how to extract keys and connect.

## Server Details

### dp-app (13.49.11.108) — t3.small
**Role**: Main DigitalPlattform application server
- **OS**: Ubuntu 20.04 — uptime 835+ days
- **Stack**: Node.js + nginx + PM2 + certbot
- **PM2 Apps** (9 services):
  - `dp-server` (port 4000) — main server, 265MB RAM, 231 restarts
  - `dp-Gservice` (port 5000) — Google service, 94MB
  - `dp-MauticService` (port 5001) — Mautic integration, 38MB
  - `dp-CloudwaysService` (port 5002) — Cloudways, 33MB
  - `dp-WordpressService` (port 5003) — WordPress, 36MB
  - `dp-facebook` (port 5050) — Facebook, 39MB
  - `doc` (port 5004) — Documentation, 29MB
  - `main-express` (port 8080) — Express API, 34MB
  - `dp-service-linkedin` (port 5006) — LinkedIn, 30MB
- **Total Node RAM**: ~632MB of 2GB
- **Cron**: certbot renewal daily at 06:43

### p2-stage / p2.digitalplattform.dev (16.170.50.120) — t3.small
**Role**: P2 staging / CI runner
- **OS**: Ubuntu 20.04
- **PM2**: `p2-admin-stage` (port 4000, 380MB RAM)
- **GitHub Actions**: `actions.runner.marknadsplan-dp.p2-stage.service` running

### dp-jobs (13.50.229.84) — t3.small
**Role**: Background job processor
- **OS**: Ubuntu 20.04
- **Stack**: Node.js + nginx + PM2 + vsftpd (FTP)
- **PM2**: `job` (port 3000, 228MB), `main-express` (stopped), `mautic` (stopped)
- **Disk**: 175GB volume — large disk for job data

### p2-prod / pop (13.50.94.20) — t3.medium
**Role**: DP production-like environment
- **OS**: Ubuntu 20.04
- **PM2**: `dp-server` active (400MB), 8 other apps STOPPED
- **RAM**: 4GB total, ~633MB used — oversized

### ps-stage (16.170.221.123) — t3.medium
**Role**: PS Admin staging + databases
- **OS**: Ubuntu 24.04
- **Stack**: Node.js + nginx + Apache + Docker + PM2 + PHP 5.6
- **PM2**: `ps-v2-stage` (439MB)
- **Docker**: MongoDB 7.0 (port 27017), MySQL 5.7 (port 3306)
- **Apache**: Serves ps1.digitalplattform.dev (PHP 5.6)

### stage.digitalplattform.dev (13.62.201.3) — t3.small
**Role**: DP staging environment (multi-app via nginx path routing + vhosts)
- **OS**: Ubuntu 24.04
- **PM2**:
  - `fb-stage` (port 4001) — stage.digitalplattform.dev/fb
  - `p2-stage` (port 4002) — stage.digitalplattform.dev/p2
  - `mp-stage` (port 4003) — stage.digitalplattform.dev/mp
  - `upn-stage` (port 4004) — upn.digitalplattform.dev
  - `dp-docs` (port 4005) — docs.digitalplattform.dev

### dp-vpn (13.51.226.223) — t3.nano
**Role**: NetBird VPN gateway
- **OS**: Ubuntu 24.04
- **Stack**: NetBird only — minimal server

### alphanode2 (13.51.91.179) — m7i-flex.large
**Role**: Main WordPress hosting server
- **OS**: Ubuntu 24.04
- **Stack**: nginx + MariaDB 10.11 + PHP 8.1/7.4/7.1 FPM + fail2ban
- **Sites**: ~31 WordPress sites in `/var/www/vhosts/`
- **MariaDB**: ~4.4GB across 40+ databases
- **Cron**: health-check (5min), backup-sites (3am), wp-update-all (4am), backup-report (5am)
- **SSH key**: ed25519 (not RSA)

### cb-prod / closebuy.se (13.48.200.72) — t3.nano
- **Cannot SSH** with current keys — uses a different key not in secrets blob
- Use AWS Session Manager as fallback

### alphanode (old) — STOPPED
- Was the original Plesk server, replaced by alphanode2
- Kept stopped (no cost except EBS storage)
