#!/bin/bash
# Enable HTTP/3 (QUIC) support

echo "=== Enabling HTTP/3 (QUIC) ==="

echo ""
echo "1. Testing Nginx config..."
nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config test failed!"
    exit 1
fi

echo ""
echo "2. Opening UDP port 443 for QUIC..."
ufw allow 443/udp comment 'QUIC/HTTP3'

echo ""
echo "3. Reloading Nginx..."
systemctl reload nginx

echo ""
echo "4. Checking listening ports..."
ss -ulnp | grep ":443"
ss -tlnp | grep ":443"

echo ""
echo "5. Testing HTTP/3 advertisement header..."
curl -I https://quailbreeder.net/ 2>&1 | grep -i "alt-svc"

echo ""
echo "6. Verifying QUIC/UDP port..."
if ss -ulnp | grep -q ":443"; then
    echo "✅ UDP port 443 is listening (QUIC enabled)"
else
    echo "⚠️  UDP port 443 not listening yet (may need nginx restart)"
fi

echo ""
echo "=== HTTP/3 Status ==="
echo "To test HTTP/3 from client:"
echo "  curl --http3 https://quailbreeder.net/"
echo ""
echo "Online checker:"
echo "  https://http3check.net/?host=quailbreeder.net"
echo ""
echo "=== DONE ==="
