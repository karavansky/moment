#!/bin/bash
# Reload Nginx safely

echo "Testing Nginx config..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Config OK, reloading Nginx..."
    systemctl reload nginx
    echo "✅ Nginx reloaded"

    sleep 1

    echo ""
    echo "Testing HTTPS..."
    curl -I https://quailbreeder.net/ 2>&1 | grep "HTTP\|Alt-Svc"
else
    echo "❌ Config test failed!"
fi
