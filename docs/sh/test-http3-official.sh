#!/bin/bash
# Test HTTP/3 with official Nginx blog configuration

echo "=== Testing HTTP/3 with Official Alt-Svc Headers ==="

echo ""
echo "1. Testing config..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
systemctl reload nginx

sleep 2

echo ""
echo "3. Checking ports..."
echo "TCP (HTTP/2):"
ss -tlnp | grep ":443"
echo ""
echo "UDP (QUIC/HTTP/3):"
ss -ulnp | grep ":443"

echo ""
echo "4. Testing HTTPS..."
curl -I https://quailbreeder.net/ 2>&1 | head -10

echo ""
echo "5. Checking Alt-Svc headers..."
curl -I https://quailbreeder.net/ 2>&1 | grep "Alt-Svc"

echo ""
echo "=== Test in Browser ==="
echo "1. Open Chrome DevTools → Network"
echo "2. Visit https://quailbreeder.net/"
echo "3. Check Protocol column - should show 'h3' after first visit"
echo ""
echo "Online test: https://http3check.net/?host=quailbreeder.net"
echo ""
echo "=== DONE ==="
