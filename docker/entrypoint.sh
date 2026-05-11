#!/bin/sh
# ==============================================================
# TMail Web — Docker Entrypoint
# ==============================================================
# Converts /opt/sidoak/infra/db.env (separate vars) into
# DATABASE_URL for Prisma. Runs before Next.js starts.
# ==============================================================

set -e

echo "[entrypoint] Starting TMail Web..."

# ── Load db.env if mounted ────────────────────────────────────
DB_ENV_FILE="${DB_ENV_FILE:-/run/secrets/db.env}"

if [ -f "$DB_ENV_FILE" ]; then
  echo "[entrypoint] Loading DB credentials from $DB_ENV_FILE"
  
  # Source the file to get variables
  set -a
  # shellcheck disable=SC1090
  . "$DB_ENV_FILE"
  set +a
fi

# ── Construct DATABASE_URL if not already set ─────────────────
if [ -z "$DATABASE_URL" ]; then
  DB_HOST="${DB_HOST:-localhost}"
  DB_PORT="${DB_PORT:-5432}"
  
  if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
    echo "[entrypoint] ERROR: DB_NAME, DB_USER, and DB_PASS must be set"
    exit 1
  fi
  
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  echo "[entrypoint] Constructed DATABASE_URL from separate variables"
else
  echo "[entrypoint] Using existing DATABASE_URL"
fi

# ── Validate JWT_SECRET ───────────────────────────────────────
if [ -z "$JWT_SECRET" ]; then
  echo "[entrypoint] ERROR: JWT_SECRET must be set"
  exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "[entrypoint] WARNING: JWT_SECRET is shorter than 32 characters"
fi

# ── Run Prisma generate (ensure client matches schema) ────────
echo "[entrypoint] Running Prisma generate..."
npx prisma generate 2>/dev/null || true

echo "[entrypoint] Starting Next.js server..."
exec node server.js
