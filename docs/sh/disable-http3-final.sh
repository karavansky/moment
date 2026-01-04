#!/bin/bash
# Disable HTTP/3 - it causes 400 errors

echo "=== Disabling HTTP/3 ==="

nginx -t
if [ $? -eq 0 ]; then
    systemctl reload nginx
    echo "✅ Nginx reloaded without HTTP/3"

    sleep 2

    echo ""
    echo "Testing..."
    curl -I https://quailbreeder.net/ 2>&1 | head -5
else
    echo "❌ Config error!"
fi
