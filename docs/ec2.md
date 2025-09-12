# Deploying liblab.ai on EC2 with HTTPS & Auto-Restart

This document helps you deploy **liblab.ai** on an **Ubuntu 22.04 EC2 instance**, using **NGINX + Let's Encrypt TLS**, and a **systemd service** to run the app reliably on boot.

---

## 1. EC2 & Initial Setup

- Launch Ubuntu 22.04 (2 vCPU / 4–8 GB RAM, \~60 GB storage).
- Security group: open ports **22** (SSH), **3000** (initial setup), and later **80**/**443** (HTTP/HTTPS).
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

## 6. Configure NGINX as Reverse Proxy with HTTPS

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

This enables HTTPS and sets up auto-renewal ([DEV Community][1], [Reintech][2]).

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

This ensures liblab.ai auto-starts on reboot and restarts on failure ([DEV Community][3], [DigitalOcean][4]).

---

## 8. Summary Table

| Step | Action                                              |
| ---- | --------------------------------------------------- |
| 1    | Launch EC2 + open ports 22 & 3000                   |
| 2    | Install Docker, Node, pnpm, NGINX, Certbot          |
| 3    | Clone & `pnpm run setup` (prompts for provider/key) |
| 4    | (Optional) Launch Postgres via Docker               |
| 5    | `pnpm run quickstart` and test at port 3000         |
| 6    | Configure NGINX & execute Certbot to enable HTTPS   |
| 7    | Add systemd unit for auto-start on reboot           |
| 8    | Visit `https://your-domain.com` to access the app   |

---

## Recommended Production Hardenings

- Store secrets (API keys, JWT secrets) in AWS SSM or Secrets Manager and inject them at runtime.
- Use RDS Postgres and configure `DATABASE_URL`.
- Optionally deploy via ECS/Fargate for scaling.
- Set up logging and monitoring (e.g., CloudWatch, metrics dashboards).
- Restrict direct access to port 3000 via local interface only.
