#!/bin/bash
# Debug what's in the included SSL files

echo "=== Debugging SSL Include Files ==="

echo ""
echo "1. Contents of options-ssl-nginx.conf..."
cat /etc/letsencrypt/options-ssl-nginx.conf

echo ""
echo "2. Check ssl-dhparams.pem exists and size..."
ls -lh /etc/letsencrypt/ssl-dhparams.pem

echo ""
echo "3. Full nginx -T output (to see if server block is parsed at all)..."
nginx -T 2>&1 > /tmp/nginx-full-config.txt
echo "Saved to /tmp/nginx-full-config.txt"

echo ""
echo "4. Search for 'quailbreeder.net' in parsed config..."
grep -n "quailbreeder.net" /tmp/nginx-full-config.txt

echo ""
echo "5. Count 'server {' blocks in parsed config..."
grep -c "server {" /tmp/nginx-full-config.txt

echo ""
echo "6. Show all server_name directives..."
grep "server_name" /tmp/nginx-full-config.txt

echo ""
echo "7. Check if there are any 'emerg' level errors..."
grep -i "emerg\|alert" /var/log/nginx/error.log | tail -20

echo ""
echo "=== DONE ==="
