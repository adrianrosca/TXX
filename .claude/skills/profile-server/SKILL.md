---
name: profile-server
description: SSH into a server and produce a health report
---

## Summary

SSH into any server and produce a brief health report covering: uptime, system load, disk usage, CPU/RAM, running services, and anything that looks abnormal.

## Usage

When user invokes `/profile-server`, ask which server to profile (unless already specified). Refer to the server inventory in `ssh/SKILL.md`.

## Procedure

### 1. SSH and run the profiling commands

Run all commands in a single SSH session for efficiency:

```bash
ssh -i /tmp/ssh_key <user>@<IP> 'bash -s' << 'PROFILE'
echo "===== UPTIME ====="
uptime

echo "===== OS ====="
lsb_release -ds 2>/dev/null || cat /etc/os-release | head -3

echo "===== CPU ====="
nproc
lscpu | grep "Model name"

echo "===== MEMORY ====="
free -h

echo "===== DISK ====="
df -h / | tail -1
df -h | grep -v tmpfs | grep -v udev | grep -v loop

echo "===== LOAD AVERAGE ====="
cat /proc/loadavg

echo "===== TOP PROCESSES BY CPU ====="
ps aux --sort=-%cpu | head -11

echo "===== TOP PROCESSES BY MEMORY ====="
ps aux --sort=-%mem | head -11

echo "===== SYSTEMD FAILED UNITS ====="
systemctl --failed --no-pager 2>/dev/null || echo "N/A"

echo "===== KEY SERVICES STATUS ====="
for svc in nginx apache2 mysql mariadb php*-fpm docker pm2-ubuntu fail2ban postfix certbot.timer; do
  systemctl is-active "$svc" 2>/dev/null && echo "$svc: active" || true
done

echo "===== PM2 (if available) ====="
command -v pm2 &>/dev/null && pm2 jlist 2>/dev/null || sudo -u ubuntu bash -c 'export PATH=$PATH:/home/ubuntu/.nvm/default/bin:/usr/local/bin; pm2 jlist 2>/dev/null' || echo "pm2 not found"

echo "===== LISTENING PORTS ====="
ss -tlnp 2>/dev/null | grep LISTEN

echo "===== RECENT OOM KILLS ====="
dmesg -T 2>/dev/null | grep -i "out of memory" | tail -5 || journalctl -k --no-pager -g "Out of memory" --since "7 days ago" 2>/dev/null | tail -5 || echo "None found"

echo "===== ZOMBIE PROCESSES ====="
ps aux | awk '$8 ~ /Z/ {print}' || echo "None"

echo "===== DISK INODE USAGE ====="
df -i / | tail -1

echo "===== LAST REBOOT ====="
who -b

echo "===== DONE ====="
PROFILE
```

### 2. Interpret and report

After collecting the output, produce a brief report covering:

1. **Uptime** - How long the server has been running
2. **System load** - Is it overloaded? (compare load avg to vCPU count)
3. **RAM** - Total, used, available. Is swap being used heavily?
4. **Disk** - Usage percentage. Flag if >80%
5. **Services** - Any failed systemd units? Key services running?
6. **Processes** - Top CPU/memory consumers. Anything unexpected?
7. **Issues** - OOM kills, zombie processes, high inode usage, failed services
8. **PM2** (if applicable) - App status, restarts, memory usage
9. **Overall assessment** - Quick summary: healthy / needs attention / critical

### Report format

Keep the report concise and scannable:

```
## Server Profile: <name> (<IP>)
**Date**: YYYY-MM-DD
**Uptime**: X days
**OS**: Ubuntu XX.XX

| Metric | Value | Status |
|--------|-------|--------|
| CPU Load | 0.5 / 2 cores | OK |
| RAM | 1.2G / 2G (60%) | OK |
| Disk | 15G / 30G (50%) | OK |
| Swap | 0B used | OK |

**Services**: All OK / X failed
**PM2 Apps**: X running, Y stopped, Z errored

### Issues Found
- (list anything abnormal, or "None - server looks healthy")

### Top Processes
| Process | CPU% | MEM% | Notes |
|---------|------|------|-------|
| ... | ... | ... | ... |
```

## Notes

- If a command fails (permission denied, not installed), skip it and note in report
- Some servers won't have PM2 or web services — adapt accordingly
- If the server uses a non-standard user (e.g. `adrian` on ps-prod), adjust the SSH command
