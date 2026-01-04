#!/bin/bash
# Check if Nginx supports http2 directive

echo "=== Checking HTTP/2 Support ==="

echo ""
echo "1. Nginx version and modules..."
nginx -V 2>&1 | grep -i "http.*v2\|http.*v3"

echo ""
echo "2. Testing if 'http2 on;' directive is recognized..."
nginx -T 2>&1 | grep -i "http2"

echo ""
echo "3. Checking what directives Nginx actually loaded..."
nginx -T 2>&1 | grep -A30 "server_name quailbreeder.net"

echo ""
echo "4. Count server blocks in parsed config..."
echo "Number of server blocks: $(nginx -T 2>&1 | grep -c 'server {')"

echo ""
echo "5. Full server block for quailbreeder.net..."
nginx -T 2>&1 | awk '/server {/,/^}$/' | grep -A50 "quailbreeder.net" | head -60

echo ""
echo "=== DONE ==="
