#!/bin/bash
# Fix Nginx subdomain configurations

echo "=== Fixing Nginx Subdomain Configuration ==="
echo ""

# Backup
BACKUP="/etc/nginx/sites-available/default.backup-$(date +%Y%m%d-%H%M%S)"
echo "1. Creating backup: $BACKUP"
sudo cp /etc/nginx/sites-available/default "$BACKUP"
echo "   ✅ Backup created"
echo ""

echo "2. Fixing server blocks..."
echo ""

# Create temporary file with fixes
cat > /tmp/nginx-subdomain-fixes.txt << 'EOF'

# ===== REDIRECT SUBDOMAINS TO MAIN DOMAIN =====
# karavansky, moment, monitor → https://quailbreeder.net
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
# ws.quailbreeder.net → localhost:3003
server {
    server_name ws.quailbreeder.net;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/quailbreeder.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quailbreeder.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        # Allow many simultaneous connections per IP
        limit_conn addr 1000;

        # Proxy to WebSocket backend on port 3003
        proxy_pass http://localhost:3003/;

        # WebSocket timeout settings
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 60s;

        # WebSocket headers
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
# app.quailbreeder.net → localhost:3001
server {
    server_name app.quailbreeder.net;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/quailbreeder.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quailbreeder.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Proxy buffering for large responses
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 512k;
    proxy_busy_buffers_size 1m;

    location / {
        # Rate limit for app pages
        limit_req zone=general burst=20 nodelay;

        # Proxy to app backend on port 3001
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

EOF

echo "   New configuration blocks created in /tmp/nginx-subdomain-fixes.txt"
echo ""
echo "3. Manual steps required:"
echo ""
echo "   Open /etc/nginx/sites-available/default and:"
echo ""
echo "   Step 1: DELETE the server block at lines 290-374"
echo "           (starts with 'server_name moment.quailbreeder.net karavansky.quailbreeder.net app.quailbreeder.net')"
echo ""
echo "   Step 2: DELETE the server block at lines 411-491"
echo "           (starts with 'server_name ws.quailbreeder.net monitor.quailbreeder.net')"
echo ""
echo "   Step 3: ADD the content from /tmp/nginx-subdomain-fixes.txt"
echo "           at the end of the file (before the last closing brace)"
echo ""
echo "4. After editing:"
echo "   sudo nginx -t           # Test configuration"
echo "   sudo systemctl reload nginx  # Apply changes"
echo ""
echo "Would you like me to show the exact line numbers to delete? (y/n)"
read -p "> " answer

if [ "$answer" = "y" ]; then
    echo ""
    echo "Lines to DELETE:"
    echo ""
    echo "Block 1 (karavansky/app/moment - currently wrong):"
    sudo grep -n "server_name moment.quailbreeder.net karavansky.quailbreeder.net app.quailbreeder.net" /etc/nginx/sites-available/default
    echo ""
    echo "Block 2 (ws/monitor - currently wrong):"
    sudo grep -n "server_name ws.quailbreeder.net monitor.quailbreeder.net" /etc/nginx/sites-available/default
fi

echo ""
echo "✅ Backup created: $BACKUP"
echo "✅ New config ready: /tmp/nginx-subdomain-fixes.txt"
echo ""
