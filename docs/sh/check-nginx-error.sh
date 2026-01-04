#!/bin/bash
# Check Nginx errors

echo "=== Recent Nginx Error Log ==="
tail -50 /var/log/nginx/error.log

echo ""
echo "=== Recent Nginx Access Log ==="
tail -20 /var/log/nginx/access.log | grep "400\|error"

echo ""
echo "=== Test Nginx Proxy ==="
curl -I http://localhost:3000/

echo ""
echo "=== Test via Nginx ==="
curl -I http://localhost/

echo ""
echo "=== Nginx Config Test ==="
nginx -t

echo ""
echo "=== Check Nginx is Running ==="
systemctl status nginx --no-pager | head -10

echo ""
echo "=== DONE ==="
