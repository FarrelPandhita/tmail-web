# DEPLOYMENT.md — TMail Web Production Deployment Guide

> **Target**: Ubuntu 24.04 · DigitalOcean · 2 vCPU · 2GB RAM  
> **Domain**: app.sidoak.my.id  
> **Stack**: Next.js 15 · Docker · Nginx · PostgreSQL (existing)

---

## Prerequisites Checklist

Before deploying, verify the following are already in place on your VPS:

- [ ] Postfix running and accepting mail
- [ ] PostgreSQL running with `sidoak_mail` database
- [ ] `/opt/sidoak/infra/db.env` exists with `DB_NAME`, `DB_USER`, `DB_PASS`
- [ ] DNS A record: `app.sidoak.my.id` → VPS IP
- [ ] Port 80 and 443 open in firewall
- [ ] Docker and Docker Compose installed (see SERVER_SETUP.md)
- [ ] Nginx installed (see SERVER_SETUP.md)
- [ ] Certbot installed (see SERVER_SETUP.md)

---

## Step 1: Clone the Repository

```bash
cd /opt
git clone https://github.com/YOUR_ORG/tmail-web.git tmail-web
cd /opt/tmail-web
```

Or transfer files manually:
```bash
# From local machine:
rsync -avz --exclude=node_modules --exclude=.next ./ root@YOUR_VPS_IP:/opt/tmail-web/
```

---

## Step 2: Configure Environment

Create the production environment file:

```bash
cp /opt/tmail-web/.env.example /opt/tmail-web/.env.production
```

Edit `/opt/tmail-web/.env.production`:

```bash
nano /opt/tmail-web/.env.production
```

Set the following:

```env
JWT_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
APP_VERSION=1.0.0
NEXTAUTH_URL=https://app.sidoak.my.id
```

> **CRITICAL**: `JWT_SECRET` must be at least 32 characters. Never reuse across environments.

Export for Docker Compose:
```bash
export $(cat /opt/tmail-web/.env.production | xargs)
```

Or add to `/etc/environment` for persistence (see ENVIRONMENT.md).

---

## Step 3: Verify db.env

Confirm the existing credentials file is present and correct:

```bash
cat /opt/sidoak/infra/db.env
```

Expected format:
```
DB_NAME=sidoak_mail
DB_USER=sidoak_admin
DB_PASS=your_existing_password
```

The application entrypoint will automatically convert these to `DATABASE_URL`.

---

## Step 4: Build and Start Docker Container

```bash
cd /opt/tmail-web

# Build the image
docker compose -f docker-compose.prod.yml build

# Start container
JWT_SECRET="$(grep JWT_SECRET /opt/tmail-web/.env.production | cut -d= -f2)" \
docker compose -f docker-compose.prod.yml up -d
```

Or with env file:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Verify container is running:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

Test health endpoint (before Nginx):
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","db":"connected",...}
```

---

## Step 5: Run Prisma Introspection

> **IMPORTANT**: Run this to sync the Prisma schema with your real database columns.

```bash
# Inside the container
docker exec tmail-web npx prisma db pull

# Verify the schema
docker exec tmail-web cat /app/prisma/schema.prisma
```

If columns differ from the shipped schema, update `prisma/schema.prisma` and rebuild.

---

## Step 6: Issue TLS Certificate

```bash
sudo certbot certonly --nginx \
  -d app.sidoak.my.id \
  --non-interactive \
  --agree-tos \
  --email your@email.com
```

Verify certificate:
```bash
ls /etc/letsencrypt/live/app.sidoak.my.id/
# fullchain.pem  privkey.pem  chain.pem
```

---

## Step 7: Configure Nginx

```bash
sudo cp /opt/tmail-web/docker/nginx.conf /etc/nginx/sites-available/tmail-web

sudo ln -s /etc/nginx/sites-available/tmail-web /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 8: Verify Production

```bash
# Test HTTPS
curl -I https://app.sidoak.my.id/api/health

# Expected response:
# HTTP/2 200
# content-type: application/json
# strict-transport-security: max-age=63072000...
# x-frame-options: DENY
```

Open in browser: `https://app.sidoak.my.id`

---

## Step 9: Create First Admin (see ADMIN_DEFAULT_SETUP.md)

---

## Step 10: Set Up Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Crontab (already installed by Certbot — verify):
sudo crontab -l | grep certbot
# Should show: 0 12 * * * /usr/bin/certbot renew --quiet

# Add Nginx reload after renewal
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

Contents of reload-nginx.sh:
```bash
#!/bin/bash
systemctl reload nginx
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

## Step 11: Configure Auto-Restart on Boot

```bash
sudo systemctl enable docker

# Create systemd service for the compose stack
sudo tee /etc/systemd/system/tmail-web.service > /dev/null <<EOF
[Unit]
Description=TMail Web Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/tmail-web
EnvironmentFile=/opt/tmail-web/.env.production
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tmail-web
```

---

## Deployment Verification Checklist

- [ ] `curl https://app.sidoak.my.id/api/health` returns `{"status":"ok","db":"connected"}`
- [ ] HTTP → HTTPS redirect works
- [ ] Login page loads at `https://app.sidoak.my.id/login`
- [ ] Buyer login works with generated email
- [ ] Admin login works
- [ ] OTP appears in buyer dashboard
- [ ] Superadmin audit log written on inbox view
- [ ] Container restarts automatically after reboot
- [ ] TLS certificate valid (no browser warnings)
