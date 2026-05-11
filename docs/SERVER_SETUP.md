# SERVER_SETUP.md — VPS Initial Setup for TMail Web

> **OS**: Ubuntu 24.04 LTS  
> **Provider**: DigitalOcean  
> **Resources**: 2 vCPU, 2GB RAM  

This document covers installing all required software on a **fresh** VPS.
If Docker, Nginx, or Certbot are already installed, skip those sections.

> ⚠️ **DO NOT** reinstall or modify PostgreSQL, Postfix, or the mail stack.

---

## 1. System Update

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip software-properties-common ufw
```

---

## 2. Firewall (UFW)

```bash
# Allow SSH, HTTP, HTTPS only
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verify
sudo ufw status
```

> Do NOT open port 3000 to the public — Nginx handles all external traffic.

---

## 3. Install Docker

```bash
# Remove old Docker versions
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Install Docker official repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (optional)
sudo usermod -aG docker $USER

# Verify
docker --version
docker compose version
```

---

## 4. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verify
nginx -v
curl -I http://localhost
```

---

## 5. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx

# Verify
certbot --version
```

---

## 6. Verify Existing Infrastructure (DO NOT MODIFY)

```bash
# PostgreSQL — should be running
sudo systemctl status postgresql
psql -U sidoak_admin -d sidoak_mail -c "SELECT count(*) FROM generated_emails;" 2>/dev/null

# Postfix — should be running
sudo systemctl status postfix

# db.env — must exist
cat /opt/sidoak/infra/db.env
# Expected: DB_NAME=sidoak_mail  DB_USER=...  DB_PASS=...

# Mail directory
ls /var/mail/ || ls /home/*/Maildir/ 2>/dev/null
```

---

## 7. Create App Directory

```bash
sudo mkdir -p /opt/tmail-web
sudo chown $USER:$USER /opt/tmail-web
```

---

## 8. (Optional) Swap File for Memory Safety

> Recommended for 2GB RAM VPS to prevent OOM kills during Docker builds.

```bash
# Create 1GB swap
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

---

## 9. PostgreSQL User Permission (if needed)

Your existing `sidoak_admin` user should already have access. Verify:

```bash
sudo -u postgres psql -c "\du sidoak_admin"
```

If the user needs to connect from Docker's `host-gateway` IP range, ensure `pg_hba.conf` allows it:

```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add this line if not present (allow local connections):
```
host    sidoak_mail    sidoak_admin    127.0.0.1/32    md5
host    sidoak_mail    sidoak_admin    172.17.0.0/16   md5
```

```bash
sudo systemctl reload postgresql
```

---

## 10. Verify Network

```bash
# Confirm PostgreSQL listens on 127.0.0.1
ss -tnlp | grep 5432

# Confirm port 3000 is NOT public
ss -tnlp | grep 3000  # Should only appear after Docker container starts

# Test DNS for app.sidoak.my.id
dig +short app.sidoak.my.id
# Should return your VPS IP
```

---

## System Resource Check

Before deploying, verify available resources:

```bash
free -h        # Should have at least 1GB available
df -h /        # Should have at least 5GB free disk
nproc          # Should show 2+ CPUs
```
