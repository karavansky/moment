#!/bin/bash
# Fix WebSocket connection conflicts - remove global connection limits

echo "=== Fixing WebSocket Connection Conflicts ==="
echo ""
echo "Problem: limit_conn addr was applied globally, blocking WebSocket"
echo "Solution: Remove connection limits from / and static, keep only for WebSocket paths"
echo ""

echo "1. Testing configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config test failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
sudo systemctl reload nginx

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Configuration applied successfully!"
    echo ""
    echo "=== New Configuration ==="
    echo ""
    echo "Next.js (/):"
    echo "  - Rate limit: 10 req/s (burst 20)"
    echo "  - Connection limit: NONE (no conflicts)"
    echo ""
    echo "Static assets:"
    echo "  - Rate limit: 50 req/s (burst 100)"
    echo "  - Connection limit: NONE (no conflicts)"
    echo ""
    echo "WebSocket /ws/ (port 3003):"
    echo "  - Rate limit: NONE (unlimited)"
    echo "  - Connection limit: 250 per IP"
    echo "  - Timeout: 3600s (1 hour)"
    echo ""
    echo "WebSocket /app/ (port 3001):"
    echo "  - Rate limit: NONE (unlimited)"
    echo "  - Connection limit: 250 per IP"
    echo "  - Timeout: 3600s (1 hour)"
    echo ""
    echo "Testing site..."
    curl -I https://quailbreeder.net/ 2>&1 | head -5
    echo ""
    echo "✅ WebSocket and website should both work now!"
    echo ""
    echo "Monitor connections:"
    echo "  sudo ss -tn | grep -E \":(3000|3001|3003)\" | grep ESTAB | wc -l"
else
    echo ""
    echo "❌ Reload failed!"
    exit 1
fi
