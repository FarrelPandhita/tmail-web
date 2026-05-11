# TROUBLESHOOTING.md — TMail Web Operations Runbook

> Production VPS operations guide for TMail Web on app.sidoak.my.id

---

## Quick Diagnostics

Run this first to get a system overview:

```bash
# Container status
docker compose -f /opt/tmail-web/docker-compose.prod.yml ps

# Health check
curl -s http://localhost:3000/api/health | python3 -m json.tool

# Recent logs (last 50 lines)
docker compose -f /opt/tmail-web/docker-compose.prod.yml logs --tail=50

# Nginx status
sudo systemctl status nginx

# PostgreSQL status
sudo systemctl status postgresql
```

---

## Issue: Container Won't Start

### Check logs
```bash
docker compose -f /opt/tmail-web/docker-compose.prod.yml logs tmail-web
```

### Common causes:

**1. DATABASE_URL not set or wrong**
```bash
# Check if db.env is mounted correctly
docker exec tmail-web cat /run/secrets/db.env

# Check constructed URL (no password shown)
docker exec tmail-web printenv DATABASE_URL | sed 's/:.*@/:***@/'
```

**2. JWT_SECRET not set**
```bash
docker exec tmail-web printenv JWT_SECRET | wc -c
# Should be > 32
```

**3. PostgreSQL not accepting Docker connections**
```bash
# Test connection from inside container
docker exec tmail-web node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => { console.log('OK'); p.\$disconnect(); }).catch(e => { console.error('FAIL:', e.message); process.exit(1); });
"
```

Fix: Update `/etc/postgresql/*/main/pg_hba.conf`:
```
host  sidoak_mail  sidoak_admin  172.17.0.0/16  md5
```
Then: `sudo systemctl reload postgresql`

---

## Issue: Health Check Fails

```bash
curl -v http://localhost:3000/api/health
```

**DB disconnected response**: Database connection issue → see "PostgreSQL connection" above.

**Connection refused**: Container is not running or port mapping is wrong.

```bash
docker ps | grep tmail-web
ss -tnlp | grep 3000
```

---

## Issue: Login Fails

### Check: Is the admin/email in the database?

```bash
sudo -u postgres psql -d sidoak_mail -c "SELECT email, role, is_superadmin FROM admins;"
sudo -u postgres psql -d sidoak_mail -c "SELECT generated_email, is_active FROM generated_emails LIMIT 10;"
```

### Check: Rate limit hit?

```bash
# Login endpoint returns 429 if locked
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@sidoak.my.id","password":"wrong"}'
# If 429: wait 15 minutes or restart container to reset in-memory rate limit
docker compose -f /opt/tmail-web/docker-compose.prod.yml restart
```

### Check: Password hash mismatch?

The application uses Argon2id. Ensure no plaintext passwords exist:
```bash
sudo -u postgres psql -d sidoak_mail -c "
SELECT email, LEFT(password_hash, 15) as hash_prefix
FROM admins;
"
# hash_prefix should start with: $argon2id$
```

---

## Issue: Nginx 502 Bad Gateway

```bash
# Is the container running?
docker ps | grep tmail-web

# Is it listening?
curl -s http://localhost:3000/api/health

# Check Nginx config
sudo nginx -t
sudo cat /etc/nginx/sites-enabled/tmail-web

# Check Nginx error log
sudo tail -50 /var/log/nginx/error.log
```

---

## Issue: SSL Certificate Errors

```bash
# Check certificate expiry
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Test renewal
sudo certbot renew --dry-run

# Reload Nginx after renewal
sudo systemctl reload nginx
```

---

## Issue: OTP Not Appearing

OTP is populated by your existing `parser.py` script. Verify:

```bash
# Check otp_cache table
sudo -u postgres psql -d sidoak_mail -c "
SELECT ge.generated_email, oc.latest_otp, oc.updated_at
FROM otp_cache oc
JOIN generated_emails ge ON ge.id = oc.generated_email_id
ORDER BY oc.updated_at DESC
LIMIT 10;
"

# Check parser is running
ps aux | grep parser.py

# Check inbox_messages for recent entries
sudo -u postgres psql -d sidoak_mail -c "
SELECT recipient, otp_code, received_at
FROM inbox_messages
ORDER BY received_at DESC
LIMIT 5;
"
```

---

## Issue: High Memory Usage

```bash
# Check container memory
docker stats tmail-web --no-stream

# Check overall system
free -h
top -bn1 | head -20
```

If memory exceeds 512MB limit:
```bash
# Restart container (clears in-memory rate limit cache too)
docker compose -f /opt/tmail-web/docker-compose.prod.yml restart

# Check for memory leak in logs
docker compose -f /opt/tmail-web/docker-compose.prod.yml logs --since 1h | grep -i "heap\|memory\|oom"
```

---

## Routine Maintenance

### Update Application

```bash
cd /opt/tmail-web
git pull origin main

# Rebuild and restart (zero-downtime approach)
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### View Database Stats

```bash
sudo -u postgres psql -d sidoak_mail -c "
SELECT
  (SELECT count(*) FROM generated_emails) as total_emails,
  (SELECT count(*) FROM generated_emails WHERE is_active = true) as active_emails,
  (SELECT count(*) FROM inbox_messages) as total_messages,
  (SELECT count(*) FROM otp_cache) as otp_entries,
  (SELECT count(*) FROM audit_logs) as audit_entries;
"
```

### Clear Old Audit Logs (if table grows large)

```bash
# Keep last 90 days of audit logs
sudo -u postgres psql -d sidoak_mail -c "
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
"
```

### Check Docker Disk Usage

```bash
docker system df
docker image prune -f  # Remove unused images
```

---

## Log Locations

| Component | Log location |
|-----------|-------------|
| Next.js app | `docker logs tmail-web` |
| Nginx access | `/var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` |
| PostgreSQL | `/var/log/postgresql/` |
| Certbot | `/var/log/letsencrypt/` |
| Systemd service | `journalctl -u tmail-web` |

---

## Emergency Procedures

### Immediate Lockdown (Disable all logins)

```bash
# Option 1: Stop the application
docker compose -f /opt/tmail-web/docker-compose.prod.yml stop

# Option 2: Block at Nginx level
sudo echo "deny all;" >> /etc/nginx/sites-enabled/tmail-web
sudo systemctl reload nginx

# Option 3: Disable specific email accounts in DB
sudo -u postgres psql -d sidoak_mail -c "
UPDATE generated_emails SET is_active = false WHERE id = 'EMAIL_UUID';
"
```

### JWT Invalidation (Force all sessions to expire)

```bash
# Change JWT_SECRET → all tokens immediately invalid
nano /opt/tmail-web/.env.production
# Update JWT_SECRET=new_secret_here

# Restart container to pick up new secret
docker compose -f /opt/tmail-web/docker-compose.prod.yml up -d --force-recreate
```

### Restore from Backup

> The application has no state outside PostgreSQL. To restore:
1. Restore PostgreSQL backup: `pg_restore -d sidoak_mail backup.dump`
2. Restart container: `docker compose -f docker-compose.prod.yml restart`
