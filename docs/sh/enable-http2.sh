#!/bin/bash
# Enable HTTP/2 on HTTPS

echo "=== Enabling HTTP/2 ==="

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
    echo "✅ HTTP/2 enabled successfully!"
    echo ""
    echo "3. Testing HTTP/2..."
    curl -I --http2 https://quailbreeder.net/ 2>&1 | head -8
    echo ""
    echo "4. Verifying protocol..."
    curl -sI --http2 https://quailbreeder.net/ 2>&1 | grep -i "HTTP/"
    echo ""
    echo "=== HTTP/2 Benefits ==="
    echo "✅ Multiplexing - multiple requests over one connection"
    echo "✅ Header compression - smaller request/response sizes"
    echo "✅ Server push - proactive resource delivery"
    echo "✅ Binary protocol - more efficient parsing"
    echo "✅ Better performance than HTTP/1.1"
    echo ""
    echo "Test in browser DevTools → Network → Protocol column"
    echo "Should show: h2 (HTTP/2)"
    echo ""
else
    echo ""
    echo "❌ Reload failed!"
    exit 1
fi
