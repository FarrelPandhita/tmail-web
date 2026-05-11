# ENVIRONMENT.md — Environment Variables Reference

> All secrets must be set before starting the application.  
> Never commit `.env`, `.env.local`, or `.env.production` to version control.

---

## Variable Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret. **Min 32 chars.** | `openssl rand -hex 32` |
| `NODE_ENV` | Node.js environment | `production` |
| `DATABASE_URL` | Full Prisma connection string | See "Database URL" below |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_VERSION` | Version shown in health check | `1.0.0` |
| `NEXTAUTH_URL` | Full URL for the app | `https://app.sidoak.my.id` |
| `PORT` | Port for Next.js to listen on | `3000` |
| `HOSTNAME` | Bind address | `0.0.0.0` |

---

## Database URL Construction

The existing VPS uses `/opt/sidoak/infra/db.env` with separate variables.

The Docker **entrypoint.sh** automatically constructs `DATABASE_URL`:

```bash
# /opt/sidoak/infra/db.env
DB_NAME=sidoak_mail
DB_USER=sidoak_admin
DB_PASS=your_existing_password

# Becomes:
DATABASE_URL=postgresql://sidoak_admin:your_existing_password@host.docker.internal:5432/sidoak_mail
```

The following are **assumed defaults** if not in db.env:
- `DB_HOST=host.docker.internal` (set in docker-compose.prod.yml)
- `DB_PORT=5432`

---

## How Environment Variables Are Loaded

### Production (Docker)

1. `docker-compose.prod.yml` sets `DB_HOST`, `DB_PORT`, passes `JWT_SECRET` from shell
2. `/opt/sidoak/infra/db.env` is mounted as `/run/secrets/db.env` (read-only)
3. `docker/entrypoint.sh` sources the file and constructs `DATABASE_URL`

### Local Development

1. Copy `.env.example` → `.env.local`
2. Set `DATABASE_URL` directly (you need SSH tunnel to VPS or local DB)
3. `npm run dev` loads `.env.local` automatically

---

## Generating JWT_SECRET

```bash
# Generate a secure 64-character hex string
openssl rand -hex 32

# Or with /dev/urandom
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 48 | head -n 1
```

---

## Storing JWT_SECRET on VPS

### Method 1: /etc/environment (persistent)

```bash
echo 'JWT_SECRET=your_secret_here' | sudo tee -a /etc/environment
source /etc/environment
```

### Method 2: .env.production file

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> /opt/tmail-web/.env.production
```

Then reference in systemd service:
```ini
EnvironmentFile=/opt/tmail-web/.env.production
```

---

## Security Rules

1. **Never** put `DATABASE_URL` in docker-compose.prod.yml directly — it uses db.env
2. **Never** hardcode `JWT_SECRET` in any source file
3. **Never** commit `.env*` files to Git (verify `.gitignore`)
4. Rotate `JWT_SECRET` periodically — all existing sessions will be invalidated

---

## Verify Environment Inside Container

```bash
# Check DATABASE_URL was constructed correctly
docker exec tmail-web printenv DATABASE_URL
# Should NOT show 'build' — must show real credentials

# Test DB connection
docker exec tmail-web node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => { console.log('DB OK'); p.\$disconnect(); }).catch(console.error);
"
```
