# Deploying liblab.ai on EC2 with HTTPS & Auto-Restart

This document helps you deploy **liblab.ai** on an **Ubuntu 22.04 EC2 instance**, using **NGINX + Let's Encrypt TLS**, and a **systemd service** to run the app reliably on boot.

---

## 1. EC2 & Initial Setup

- Launch Ubuntu 22.04 (2 vCPU / 4–8 GB RAM, \~60 GB storage).
- Security group: open ports **22** (SSH), **3000** (initial setup). If using NGINX, also open **80**/**443** (HTTP/HTTPS).
- SSH in:

  ```bash
  ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
  ```

---

## 2. Install Dependencies

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin curl nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
npm sudo install -g pnpm
```

---

## 3. Clone & Set Up liblab.ai

```bash
git clone https://github.com/liblaber/ai.git
cd ai
pnpm run setup
```

- Generates `AUTH_SECRET`, `ENCRYPTION_KEY`
- Prompts for LLM provider, model, API key (enforced format)
- Optionally captures `NETLIFY_AUTH_TOKEN`

**Note:** If you put a domain or reverse proxy in front of the app, set `BASE_URL` in your `.env` to the public hostname (the domain you will use), e.g. `BASE_URL=https://your-domain.com`. This ensures generated links and redirects use the correct public URL instead of `localhost` or the instance IP.

---

## 4. (Optional) Local Postgres

```bash
docker compose -f docker-compose.db.yml up -d
```

Or set `DATABASE_URL` to RDS in `.env`.

---

## 5. Launch app via Docker

```bash
pnpm run quickstart
```

Verify: `http://<EC2_PUBLIC_IP>:3000/`

---

## 6. Configure Reverse Proxy

Choose one of the following options:

### Option A: Cloudflared Tunnel (Recommended - Simpler)

Cloudflared creates a secure tunnel without needing to manage SSL certificates or open additional ports.

**a.** Install Cloudflared:

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

**b.** Authenticate with Cloudflare:

```bash
cloudflared tunnel login
```

**c.** Create a tunnel:

```bash
cloudflared tunnel create liblab-ai
```

**d.** Configure the tunnel:

```bash
cloudflared tunnel route dns liblab-ai your-domain.com
```

**e.** Create tunnel configuration:

```bash
sudo mkdir -p /etc/cloudflared
sudo tee /etc/cloudflared/config.yml <<EOF
tunnel: liblab-ai
credentials-file: /home/ubuntu/.cloudflared/$(cloudflared tunnel list --format json | jq -r '.[0].id').json

ingress:
  - hostname: your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF
```

**f.** Install as systemd service:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

**g.** Update your `.env` file:

```bash
echo "BASE_URL=https://your-domain.com" >> .env
```

Your app will now be accessible at `https://your-domain.com` with automatic HTTPS and no need to manage certificates.

### Option B: NGINX as Reverse Proxy with HTTPS

**a.** Create NGINX site file:

```bash
sudo tee /etc/nginx/sites-available/liblab.ai <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/liblab.ai /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**b.** Obtain & configure TLS with Certbot:

```bash
sudo certbot --nginx -d your-domain.com
```

This enables HTTPS and sets up auto-renewal.

---

## 7. Create systemd Service

```bash
sudo tee /etc/systemd/system/liblab-ai.service <<EOF
[Unit]
Description=liblab.ai service
After=network.target docker.service
Wants=docker.service

[Service]
WorkingDirectory=/home/ubuntu/ai
ExecStart=/usr/local/bin/pnpm run quickstart
Restart=on-failure
User=ubuntu
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable liblab-ai
sudo systemctl start liblab-ai
```

This ensures liblab.ai auto-starts on reboot and restarts on failure.

---

## 8. Summary Table

| Step | Action                                                                 |
| ---- | ---------------------------------------------------------------------- |
| 1    | Launch EC2 + open ports 22 & 3000                                      |
| 2    | Install Docker, Node, pnpm, NGINX (if using), Certbot (if using NGINX) |
| 3    | Clone & `pnpm run setup` (prompts for provider/key)                    |
| 4    | (Optional) Launch Postgres via Docker                                  |
| 5    | `pnpm run quickstart` and test at port 3000                            |
| 6    | Configure reverse proxy (Cloudflared or NGINX + HTTPS)                 |
| 7    | Add systemd unit for auto-start on reboot                              |
| 8    | Visit `https://your-domain.com` to access the app                      |

---

## Cloudflared vs NGINX Comparison

| Feature              | Cloudflared Tunnel          | NGINX + Let's Encrypt             |
| -------------------- | --------------------------- | --------------------------------- |
| **Setup Complexity** | Simple - no SSL management  | More complex - requires SSL setup |
| **Security**         | High - no open ports needed | Good - requires port management   |
| **SSL/TLS**          | Automatic via Cloudflare    | Manual via Certbot                |
| **Performance**      | Good - Cloudflare CDN       | Excellent - direct connection     |
| **Cost**             | Free tier available         | Free (Let's Encrypt)              |
| **Dependencies**     | Cloudflare account          | Domain + DNS management           |
| **Ports Required**   | Only SSH (22)               | SSH (22), HTTP (80), HTTPS (443)  |
| **Maintenance**      | Minimal                     | Certificate renewal needed        |

**Recommendation**: Use Cloudflared for simpler setup and better security. Use NGINX if you need direct control over SSL certificates or want to avoid Cloudflare dependency.

---

## Recommended Production Hardenings

- Store secrets (API keys, JWT secrets) in AWS SSM or Secrets Manager and inject them at runtime.
- Use RDS Postgres and configure `DATABASE_URL`.
- Optionally deploy via ECS/Fargate for scaling.
- Set up logging and monitoring (e.g., CloudWatch, metrics dashboards).
- **With Cloudflared**: No additional port restrictions needed - tunnel provides security.
- **With NGINX**: Restrict direct access to port 3000 via local interface only.
- Consider using Cloudflare Access for additional authentication layers if using Cloudflared.
