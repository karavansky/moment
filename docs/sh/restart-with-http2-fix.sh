#!/bin/bash
# Test and restart Nginx with HTTP/2 syntax fix

echo "=== Testing Nginx Configuration with HTTP/2 Fix ==="

echo ""
echo "1. Testing config syntax..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Config is valid!"

    echo ""
    echo "2. Restarting Nginx..."
    systemctl restart nginx

    sleep 2

    echo ""
    echo "3. Checking listening ports..."
    ss -tlnp | grep nginx

    echo ""
    echo "4. Checking port 443 specifically..."
    ss -tlnp | grep ":443"

    if ss -tlnp | grep -q ":443"; then
        echo ""
        echo "🎉 SUCCESS! Port 443 is now listening!"

        echo ""
        echo "5. Testing HTTPS connection..."
        curl -I https://quailbreeder.net/ 2>&1 | head -10

        echo ""
        echo "6. Testing HTTP/2 support..."
        curl -I --http2 https://quailbreeder.net/ 2>&1 | grep -i "http/2"
    else
        echo ""
        echo "❌ Port 443 still not listening"
        echo ""
        echo "Checking error log..."
        tail -20 /var/log/nginx/error.log
    fi
else
    echo ""
    echo "❌ Config test failed!"
fi

echo ""
echo "=== DONE ==="
