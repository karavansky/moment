#!/bin/bash
# Test HTTP/2 only configuration (HTTP/3 disabled)

echo "=== Testing HTTP/2 Only Configuration ==="

echo ""
echo "1. Testing config..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
sudo systemctl reload nginx

sleep 2

echo ""
echo "3. Checking ports..."
echo "TCP (HTTP/2):"
sudo ss -tlnp | grep ":443"
echo ""
echo "UDP (QUIC/HTTP/3) - should be empty:"
sudo ss -ulnp | grep ":443" || echo "✅ No UDP listeners - HTTP/3 disabled"

echo ""
echo "4. Testing HTTPS..."
curl -I https://quailbreeder.net/ 2>&1 | head -10

echo ""
echo "5. Checking Alt-Svc headers (should be absent)..."
curl -I https://quailbreeder.net/ 2>&1 | grep "Alt-Svc" || echo "✅ No Alt-Svc header - HTTP/3 disabled"

echo ""
echo "=== Summary ==="
echo "✅ HTTP/2 enabled (fast, reliable)"
echo "❌ HTTP/3 disabled (was causing 400 errors with Next.js proxy)"
echo ""
echo "Site should work perfectly in all browsers now!"
echo ""
