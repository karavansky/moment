#!/bin/bash
# Final HTTP/3 disable - it's broken with proxy setup

echo "=== Disabling HTTP/3 Permanently ==="

# Comment out QUIC listeners
sed -i 's/^    listen 443 quic/#    listen 443 quic/' /etc/nginx/sites-available/default
sed -i 's/^    listen \[::\]:443 quic/#    listen [::]:443 quic/' /etc/nginx/sites-available/default
sed -i 's/^    add_header Alt-Svc/#    add_header Alt-Svc/' /etc/nginx/sites-available/default

echo "Testing config..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Reloading..."
    systemctl reload nginx
    sleep 2

    echo ""
    echo "✅ HTTP/3 disabled, HTTP/2 active"
    echo ""
    echo "Testing..."
    curl -I https://quailbreeder.net/ 2>&1 | head -5
else
    echo "❌ Config error!"
fi
