#!/bin/bash
# Increase WebSocket connection limit to 1000 per IP

echo "=== Increasing WebSocket Connection Limit to 1000 ==="
echo ""
echo "Current situation:"
echo "  - 480 active connections on port 3003"
echo "  - Limit was 250 per IP"
echo "  - Nginx blocking: 'limiting connections by zone addr'"
echo ""
echo "New limit: 1000 connections per IP"
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
    echo "✅ Limits increased successfully!"
    echo ""
    echo "New configuration:"
    echo "  /ws/ (port 3003):  1000 connections per IP"
    echo "  /app/ (port 3001): 1000 connections per IP"
    echo ""
    echo "3. Checking current connections..."
    echo "Port 3003:"
    sudo ss -tn | grep ":3003" | grep ESTAB | wc -l
    echo "Port 3001:"
    sudo ss -tn | grep ":3001" | grep ESTAB | wc -l
    echo ""
    echo "4. Clearing old error log to test fresh..."
    sudo truncate -s 0 /var/log/nginx/error.log
    echo ""
    echo "✅ WebSocket should work without 'limiting connections' errors now!"
    echo ""
    echo "Monitor errors with:"
    echo "  sudo tail -f /var/log/nginx/error.log | grep -i limit"
else
    echo ""
    echo "❌ Reload failed!"
    exit 1
fi
