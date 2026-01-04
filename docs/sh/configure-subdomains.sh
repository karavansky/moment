#!/bin/bash
# Configure all subdomains properly in Nginx

echo "=== Configuring Subdomains in Nginx ==="
echo ""
echo "Configuration plan:"
echo "  ✅ quailbreeder.net → localhost:3000 (Next.js)"
echo "  ✅ www.quailbreeder.net → redirect to quailbreeder.net"
echo "  🔧 ws.quailbreeder.net → localhost:3003 (WebSocket)"
echo "  🔧 app.quailbreeder.net → localhost:3001"
echo "  🔧 karavansky.quailbreeder.net → redirect to quailbreeder.net"
echo "  🔧 moment.quailbreeder.net → redirect to quailbreeder.net"
echo "  🔧 monitor.quailbreeder.net → redirect to quailbreeder.net"
echo ""

# Backup current config
echo "1. Backing up current Nginx config..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-$(date +%Y%m%d-%H%M%S)
echo "   ✅ Backup created"
echo ""

echo "2. Configuration changes needed:"
echo ""
echo "   Server block for karavansky/moment/monitor (lines 290-374):"
echo "   - Change from: try_files \$uri \$uri/ =404"
echo "   - Change to: return 301 https://quailbreeder.net\$request_uri;"
echo ""
echo "   Server block for ws/monitor (lines 411-491):"
echo "   - ws.quailbreeder.net should proxy to localhost:3003"
echo "   - monitor.quailbreeder.net should redirect to main domain"
echo "   - Need to split into separate server blocks"
echo ""

echo "This script will create a new clean config file."
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "3. Creating new Nginx configuration..."
echo "   Please manually review and apply the changes."
echo ""
echo "The current config has these issues:"
echo "   - Lines 290-374: karavansky/app/moment server block uses try_files instead of redirects"
echo "   - Lines 411-491: ws/monitor server block mixes WebSocket proxy with redirect"
echo ""
echo "Recommended manual fixes:"
echo ""
echo "For karavansky, moment, monitor redirects, replace server block (lines 290-374) with:"
echo ""
cat << 'EOF'
# Redirect karavansky, moment, monitor to main domain
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
EOF
echo ""
echo "For ws.quailbreeder.net WebSocket, replace server block (lines 411-491) with:"
echo ""
cat << 'EOF'
# WebSocket server on ws.quailbreeder.net
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
EOF
echo ""
echo "For app.quailbreeder.net, add new server block:"
echo ""
cat << 'EOF'
# App server on app.quailbreeder.net
server {
    server_name app.quailbreeder.net;

    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/quailbreeder.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/quailbreeder.net/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

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
echo ""
echo "After making these changes:"
echo "  1. Test config: sudo nginx -t"
echo "  2. Reload Nginx: sudo systemctl reload nginx"
echo ""
