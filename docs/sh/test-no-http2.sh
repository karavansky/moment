#!/bin/bash
# Test without http2 directive

echo "=== Testing Without HTTP/2 Directive ==="

echo ""
echo "1. Testing config..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "2. Restarting Nginx..."
    systemctl restart nginx
    sleep 2

    echo ""
    echo "3. Checking ports..."
    ss -tlnp | grep nginx

    echo ""
    if ss -tlnp | grep -q ":443"; then
        echo "✅ Port 443 is listening!"
    else
        echo "❌ Port 443 still not listening"
        echo ""
        echo "Let's check what Nginx actually loaded..."
        nginx -T 2>&1 | grep -C10 "server_name quailbreeder.net"
    fi
else
    echo "Config test failed"
fi

echo ""
echo "=== DONE ==="
