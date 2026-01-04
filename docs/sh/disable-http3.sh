#!/bin/bash
# Disable HTTP/3 and revert to HTTP/2 only

echo "=== Disabling HTTP/3 (reverting to HTTP/2) ==="

echo ""
echo "Creating backup..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-http3

echo ""
echo "Removing QUIC listeners and Alt-Svc header..."
sed -i '/# HTTPS with HTTP\/3 (QUIC)/,/# HTTP\/3 advertisement/d' /etc/nginx/sites-available/default
sed -i '/add_header Alt-Svc/d' /etc/nginx/sites-available/default

# Add back simple HTTP/2 listeners
sed -i '/ssl_certificate /i\    listen 443 ssl;\n    listen [::]:443 ssl;\n' /etc/nginx/sites-available/default

echo ""
echo "Testing config..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "Reloading Nginx..."
    systemctl reload nginx

    echo ""
    echo "✅ HTTP/3 disabled, HTTP/2 active"
    echo ""
    echo "Verification:"
    curl -I https://quailbreeder.net/ 2>&1 | grep -E "Server|Alt-Svc" || true
else
    echo ""
    echo "❌ Config error, restoring backup"
    cp /etc/nginx/sites-available/default.backup-http3 /etc/nginx/sites-available/default
fi

echo ""
echo "=== DONE ==="
