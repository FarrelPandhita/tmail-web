# ADMIN_DEFAULT_SETUP.md — First Admin Creation Guide

> This guide covers creating the first superadmin and generator admin accounts.  
> All passwords are hashed with Argon2id before insertion.

---

## Overview

The `admins` table stores both `superadmin` and `generator_admin` accounts.

Admin accounts are **NOT** created through the web interface (by design — no self-registration).

You create them via one of two methods:
1. **Direct SQL** — insert with pre-hashed password
2. **CLI script** — use the included Node.js seeder

---

## Method 1: CLI Setup Script (Recommended)

Run this on the VPS to create the first admin interactively:

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP
cd /opt/tmail-web

# Run the admin creation script inside the container
docker exec -it tmail-web node -e "
const { PrismaClient } = require('@prisma/client');
const { hash } = require('argon2');

async function main() {
  const prisma = new PrismaClient();
  
  const email = 'admin@sidoak.my.id';
  const password = 'CHANGE_THIS_IMMEDIATELY';
  const role = 'superadmin';
  
  const password_hash = await hash(password, {
    type: 2,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
  
  const admin = await prisma.admins.create({
    data: {
      email,
      password_hash,
      role,
      is_superadmin: true,
    },
  });
  
  console.log('Created admin:', admin.id, admin.email, admin.role);
  await prisma.\$disconnect();
}

main().catch(console.error);
"
```

---

## Method 2: Direct SQL with Pre-Hashed Password

### Step 1: Generate Argon2id hash on VPS

```bash
docker exec -it tmail-web node -e "
const { hash } = require('argon2');
hash('YOUR_PASSWORD_HERE', { type: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 })
  .then(h => console.log('HASH:', h))
  .catch(console.error);
"
```

Copy the output hash (starts with `$argon2id$...`)

### Step 2: Insert into PostgreSQL

```bash
sudo -u postgres psql -d sidoak_mail
```

```sql
-- Insert superadmin
INSERT INTO admins (id, email, password_hash, role, is_superadmin, created_at)
VALUES (
  gen_random_uuid(),
  'admin@sidoak.my.id',
  '$argon2id$v=19$m=65536,t=3,p=1$PASTE_YOUR_HASH_HERE',
  'superadmin',
  true,
  NOW()
);

-- Verify
SELECT id, email, role, is_superadmin, created_at FROM admins;
```

---

## Creating a Generator Admin

```sql
INSERT INTO admins (id, email, password_hash, role, is_superadmin, created_at)
VALUES (
  gen_random_uuid(),
  'generator1@sidoak.my.id',
  '$argon2id$v=19$m=65536,t=3,p=1$PASTE_HASH_HERE',
  'generator_admin',
  false,
  NOW()
);
```

---

## Creating a Buyer Account

Buyers are linked to `generated_emails`, not `admins`. They log in using their generated email address and its password.

### Step 1: Create a buyer record (optional — for tracking)

```sql
INSERT INTO buyers (id, username, created_at, is_active)
VALUES (gen_random_uuid(), 'john_doe', NOW(), true);
```

### Step 2: Create a generated email for them

Use the Generator Admin dashboard at `https://app.sidoak.my.id/generator`.

Or via SQL (with Argon2id hash):

```sql
INSERT INTO generated_emails (id, buyer_id, generated_email, password_hash, is_active, created_by, created_at)
VALUES (
  gen_random_uuid(),
  'BUYER_UUID_HERE',
  'john-a92k1@sidoak.my.id',
  '$argon2id$v=19$m=65536,t=3,p=1$HASH_HERE',
  true,
  'ADMIN_UUID_HERE',
  NOW()
);
```

---

## Password Reset Flow

### Reset Admin Password

```bash
# Generate new hash
docker exec -it tmail-web node -e "
const { hash } = require('argon2');
hash('NEW_SECURE_PASSWORD', { type: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 })
  .then(h => console.log(h));
"

# Update in database
sudo -u postgres psql -d sidoak_mail -c "
UPDATE admins SET password_hash = '\$argon2id\$...' WHERE email = 'admin@sidoak.my.id';
"
```

### Reset Buyer Email Password

```bash
# Generate hash
docker exec -it tmail-web node -e "
const { hash } = require('argon2');
hash('NEW_PASSWORD', { type: 2, memoryCost: 65536, timeCost: 3, parallelism: 1 })
  .then(h => console.log(h));
"

# Update in database
sudo -u postgres psql -d sidoak_mail -c "
UPDATE generated_emails
SET password_hash = '\$argon2id\$...'
WHERE generated_email = 'john-a92k1@sidoak.my.id';
"
```

Or use the Generator Admin dashboard → **Reset Password** action.

---

## Security Policy

- Default passwords **MUST** be changed immediately after first login
- Admin passwords must be at least 12 characters
- Use a password manager
- Admin accounts should use unique email addresses
- Never share admin credentials between people — create separate accounts

---

## First Login Test

```bash
# Test login via API
curl -X POST https://app.sidoak.my.id/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sidoak.my.id","password":"YOUR_PASSWORD"}'

# Expected:
# {"ok":true,"role":"superadmin"}
```
