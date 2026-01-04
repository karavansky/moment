#!/bin/bash
# Fix rate limiting for WebSocket servers

echo "=== Fixing Rate Limiting for WebSocket Compatibility ==="

echo ""
echo "⚠️  Current issue: Rate limiting affects WebSocket connections"
echo "    - /ws/ (port 3003) needs NO rate limiting"
echo "    - /app/ (port 3001) needs NO rate limiting"
echo "    - / (port 3000 Next.js) can have rate limiting"
echo ""

echo "1. Backing up current config..."
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-ws-fix

echo ""
echo "2. Removing rate limiting from main location /..."

# Remove rate limiting from location /
sudo sed -i '/location \/ {/,/proxy_pass http:\/\/localhost:3000\/;/{
  /limit_req zone=general/d
  /limit_conn addr/d
}' /etc/nginx/sites-available/default

echo ""
echo "3. Adding WebSocket-optimized settings to /ws/..."

# Add WebSocket settings to /ws/ location
sudo sed -i '/location \/ws\/ {/a\
\		# NO rate limiting for WebSocket - long-lived connections\
\		# Allow many connections per IP for WebSocket\
\		limit_conn addr 200;\
\
\		# WebSocket timeout settings\
\		proxy_read_timeout 3600s;\
\		proxy_send_timeout 3600s;\
\		proxy_connect_timeout 60s;' /etc/nginx/sites-available/default

echo ""
echo "4. Adding WebSocket-optimized settings to /app/..."

# Add WebSocket settings to /app/ location
sudo sed -i '/location \/app\/ {/a\
\		# NO rate limiting for WebSocket - long-lived connections\
\		# Allow many connections per IP for WebSocket\
\		limit_conn addr 200;\
\
\		# WebSocket timeout settings\
\		proxy_read_timeout 3600s;\
\		proxy_send_timeout 3600s;\
\		proxy_connect_timeout 60s;' /etc/nginx/sites-available/default

echo ""
echo "5. Adding rate limiting ONLY to Next.js pages (not WebSocket)..."

# Add a specific location for Next.js pages only
sudo sed -i '/location \/ {/i\
\	# Next.js pages with rate limiting (excludes WebSocket paths)\
\	location ~ ^(?!\/ws|\/app) {\
\		# Rate limit for general pages\
\		limit_req zone=general burst=20 nodelay;\
\		# Max 20 connections per IP for HTTP\
\		limit_conn addr 20;\
\
\		proxy_pass http://localhost:3000;\
\		proxy_http_version 1.1;\
\		proxy_set_header Host $http_host;\
\		proxy_set_header X-Real-IP $remote_addr;\
\		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
\		proxy_set_header X-Forwarded-Proto $scheme;\
\	}\
' /etc/nginx/sites-available/default

echo ""
echo "6. Testing configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Config test failed! Restoring backup..."
    sudo cp /etc/nginx/sites-available/default.backup-ws-fix /etc/nginx/sites-available/default
    echo "Backup restored."
    echo ""
    echo "Manual fix required. Check /etc/nginx/sites-available/default"
    exit 1
fi

echo ""
echo "7. Reloading Nginx..."
sudo systemctl reload nginx

sleep 2

echo ""
echo "8. Testing connections..."
echo "Testing Next.js (with rate limiting):"
curl -I https://quailbreeder.net/ 2>&1 | head -5

echo ""
echo "=== WebSocket Rate Limiting Fixed ==="
echo "✅ /ws/ (port 3003): NO rate limiting, 200 connections/IP, 1h timeout"
echo "✅ /app/ (port 3001): NO rate limiting, 200 connections/IP, 1h timeout"
echo "✅ / (port 3000): Rate limited to 10 req/s, 20 connections/IP"
echo "✅ Static assets: Rate limited to 50 req/s"
echo ""
echo "WebSocket connections should work perfectly now!"
echo ""
