#!/bin/bash
# Check WebSocket 409 Conflict error

echo "=== Investigating WebSocket 409 Conflict Error ==="

echo ""
echo "1. Recent Nginx error logs..."
sudo tail -50 /var/log/nginx/error.log | grep -E "ws|409|limit|upstream" || echo "No relevant errors"

echo ""
echo "2. Recent access logs for /ws/ endpoint..."
sudo tail -100 /var/log/nginx/access.log | grep "/ws/" | tail -20

echo ""
echo "3. Current connections to WebSocket server (port 3003)..."
echo "Total ESTABLISHED:"
sudo ss -tn | grep ":3003" | grep ESTAB | wc -l
echo ""
echo "By state:"
sudo ss -tn | grep ":3003" | awk '{print $1}' | sort | uniq -c

echo ""
echo "4. Checking if rate/connection limits are being hit..."
sudo tail -100 /var/log/nginx/error.log | grep -i "limiting" | tail -10 || echo "No limiting errors"

echo ""
echo "5. Testing /ws/register endpoint..."
echo "Response:"
curl -X POST https://quailbreeder.net/ws/register -i 2>&1 | head -20

echo ""
echo "=== Analysis ==="
echo "409 Conflict usually means:"
echo "  - Client already registered (duplicate registration)"
echo "  - Resource conflict on backend (port 3003)"
echo "  - Connection limit reached (check if 250 connections exceeded)"
echo ""
echo "Check backend logs:"
echo "  docker logs <websocket-container> --tail 50"
echo "  or journalctl for the WebSocket service"
echo ""
