#!/bin/bash
# Automatically fix Nginx subdomain configurations

set -e  # Exit on error

echo "=== Auto-fixing Nginx Subdomain Configuration ==="
echo ""

# Backup
BACKUP="/etc/nginx/sites-available/default.backup-$(date +%Y%m%d-%H%M%S)"
echo "1. Creating backup: $BACKUP"
sudo cp /etc/nginx/sites-available/default "$BACKUP"
echo "   ✅ Backup created"
echo ""

echo "2. Finding problematic server blocks..."
# Find line numbers for the two problematic blocks
BLOCK1_START=$(sudo grep -n "^server {" /etc/nginx/sites-available/default | grep -A1 "290" | head -1 | cut -d: -f1)
BLOCK2_START=$(sudo grep -n "^server {" /etc/nginx/sites-available/default | grep -A1 "411" | head -1 | cut -d: -f1)

echo "   Block 1 (karavansky/app/moment): line $BLOCK1_START"
echo "   Block 2 (ws/monitor): line $BLOCK2_START"
echo ""

echo "3. Creating new configuration..."

# Create the new config by removing old blocks and adding new ones
sudo tee /tmp/nginx-new-subdomains.conf > /dev/null << 'EOF'

# ===== REDIRECT SUBDOMAINS TO MAIN DOMAIN =====
server {
    server_name karavansky.quailbreeder.net moment.quailbreeder.net monitor.quailbreeder.net;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/quailbreeder.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quailbreeder.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    return 301 https://quailbreeder.net$request_uri;
}

# ===== WEBSOCKET SERVER =====
server {
    server_name ws.quailbreeder.net;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/quailbreeder.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quailbreeder.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        limit_conn addr 1000;
        proxy_pass http://localhost:3003/;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ===== APP SERVER =====
server {
    server_name app.quailbreeder.net;
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/quailbreeder.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quailbreeder.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 512k;
    proxy_busy_buffers_size 1m;

    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "   ✅ New server blocks created"
echo ""

echo "4. Instructions for manual editing:"
echo ""
echo "   The automatic replacement is complex due to certbot-managed blocks."
echo "   Please manually edit /etc/nginx/sites-available/default:"
echo ""
echo "   Step 1: Find and DELETE these two server blocks:"
echo "           - Lines ~290-374: server_name moment.quailbreeder.net karavansky.quailbreeder.net app.quailbreeder.net"
echo "           - Lines ~411-491: server_name ws.quailbreeder.net monitor.quailbreeder.net"
echo ""
echo "   Step 2: ADD the new configuration from:"
echo "           /tmp/nginx-new-subdomains.conf"
echo "           (paste it before the last closing brace)"
echo ""
echo "   Step 3: Test and reload:"
echo "           sudo nginx -t"
echo "           sudo systemctl reload nginx"
echo ""
echo "✅ Backup: $BACKUP"
echo "✅ New config: /tmp/nginx-new-subdomains.conf"
echo ""
