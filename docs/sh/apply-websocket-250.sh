#!/bin/bash
# Apply increased WebSocket connection limit (250 per IP)

echo "=== Applying WebSocket Connection Limit: 250 per IP ==="

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
    echo "✅ WebSocket limits updated successfully!"
    echo ""
    echo "New limits:"
    echo "  /ws/ (port 3003):  250 connections per IP"
    echo "  /app/ (port 3001): 250 connections per IP"
    echo "  / (port 3000):     20 connections per IP"
    echo ""
    echo "Testing site..."
    curl -I https://quailbreeder.net/ 2>&1 | head -5
else
    echo ""
    echo "❌ Reload failed!"
    exit 1
fi
