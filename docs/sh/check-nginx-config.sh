#!/bin/bash
# Check what Nginx configuration is actually loaded

echo "=== Checking Nginx Configuration ==="

echo ""
echo "1. Which config file is being used..."
ls -la /etc/nginx/sites-enabled/

echo ""
echo "2. Content of sites-enabled/default..."
cat /etc/nginx/sites-enabled/default

echo ""
echo "3. Full parsed Nginx config (looking for port 443)..."
nginx -T 2>&1 | grep -C5 "listen.*443"

echo ""
echo "4. Check if there are multiple server blocks..."
nginx -T 2>&1 | grep -c "server {"

echo ""
echo "5. Nginx test..."
nginx -t

echo ""
echo "=== DONE ==="
