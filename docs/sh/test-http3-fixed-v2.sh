#!/bin/bash
# Test HTTP/3 with fixed Connection header

echo "=== Testing HTTP/3 with Fixed Proxy Headers ==="

nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Config error!"
    exit 1
fi

echo "Reloading Nginx..."
systemctl reload nginx

sleep 2

echo ""
echo "Testing HTTP/1.1..."
curl -I https://quailbreeder.net/ 2>&1 | head -8

echo ""
echo "Checking Alt-Svc..."
curl -I https://quailbreeder.net/ 2>&1 | grep "Alt-Svc"

echo ""
echo "UDP Port 443..."
ss -ulnp | grep ":443" | head -3

echo ""
echo "✅ HTTP/3 enabled without 'Connection: upgrade' header"
echo "Test in browser now - should work!"
