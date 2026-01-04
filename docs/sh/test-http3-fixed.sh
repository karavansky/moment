#!/bin/bash
# Test HTTP/3 with fixed configuration

echo "=== Testing HTTP/3 Fixed Configuration ==="

echo ""
echo "1. Testing Nginx config..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config test failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
systemctl reload nginx

echo ""
echo "3. Waiting for reload..."
sleep 2

echo ""
echo "4. Checking listening ports..."
echo "TCP (SSL/TLS):"
ss -tlnp | grep ":443"
echo ""
echo "UDP (QUIC):"
ss -ulnp | grep ":443"

echo ""
echo "5. Testing HTTPS with curl..."
curl -I https://quailbreeder.net/ 2>&1 | head -10

echo ""
echo "6. Checking Alt-Svc header..."
curl -I https://quailbreeder.net/ 2>&1 | grep -i "alt-svc"

echo ""
echo "7. Testing from browser perspective..."
echo "Open https://quailbreeder.net/ in Chrome"
echo "Check DevTools -> Network -> Protocol column"
echo "Should show 'h3' for HTTP/3"

echo ""
echo "8. Wait 30 seconds, then test online:"
echo "https://http3check.net/?host=quailbreeder.net"

echo ""
echo "=== DONE ==="
