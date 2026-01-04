#!/bin/bash
# Debug what happens when QUIC request reaches Next.js

echo "=== Debugging QUIC → Next.js Request Chain ==="

echo ""
echo "1. Reload Nginx..."
nginx -t && systemctl reload nginx
sleep 2

echo ""
echo "2. Test direct Next.js (bypassing Nginx)..."
curl -I http://localhost:3000/ | head -5

echo ""
echo "3. Test via Nginx HTTP/1.1..."
curl -I https://quailbreeder.net/ | head -8

echo ""
echo "4. Check if Next.js logs show anything..."
docker logs blog --tail 20 | grep -i "error\|400" || echo "No errors in Next.js logs"

echo ""
echo "5. Watch Nginx error log during request..."
echo "Make a request to https://quailbreeder.net/ NOW in your browser..."
echo "Press Ctrl+C after request..."
timeout 10 tail -f /var/log/nginx/error.log | grep -i "quic\|http3\|400" &

echo ""
echo "=== Analysis ==="
echo "If Next.js works directly but fails via QUIC:"
echo "  → Problem is in Nginx QUIC → HTTP/1.1 translation"
echo "  → Solution: Disable HTTP/3, use HTTP/2 only"
echo ""
