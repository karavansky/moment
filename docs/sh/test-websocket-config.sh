#!/bin/bash
# Test WebSocket-optimized configuration

echo "=== Testing WebSocket-Optimized Nginx Configuration ==="

echo ""
echo "1. Testing config..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config test failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
sudo systemctl reload nginx

sleep 2

echo ""
echo "3. Testing Next.js (with rate limiting)..."
curl -I https://quailbreeder.net/ 2>&1 | head -5

echo ""
echo "4. Checking active connections..."
sudo netstat -an | grep -E ":(3000|3001|3003)" | grep ESTABLISHED | wc -l
echo "active connections to backends"

echo ""
echo "5. Checking Nginx worker connections..."
ps aux | grep 'nginx: worker' | grep -v grep

echo ""
echo "=== WebSocket Configuration Summary ==="
echo ""
echo "🌐 Next.js (port 3000):"
echo "   - Rate limit: 10 req/s (burst 20)"
echo "   - Connection limit: 20 per IP"
echo "   - Timeout: default (60s)"
echo ""
echo "🔌 WebSocket /ws/ (port 3003):"
echo "   - NO rate limiting (unlimited requests)"
echo "   - Connection limit: 200 per IP"
echo "   - Timeout: 3600s (1 hour)"
echo ""
echo "📱 WebSocket /app/ (port 3001):"
echo "   - NO rate limiting (unlimited requests)"
echo "   - Connection limit: 200 per IP"
echo "   - Timeout: 3600s (1 hour)"
echo ""
echo "📦 Static assets:"
echo "   - Rate limit: 50 req/s (burst 100)"
echo "   - Connection limit: 50 per IP"
echo "   - Cache: 7 days"
echo ""
echo "✅ WebSocket servers should work perfectly now!"
echo ""
echo "Monitor with:"
echo "  watch -n 1 'sudo netstat -an | grep -E \":(3000|3001|3003)\" | grep ESTABLISHED | wc -l'"
echo ""
