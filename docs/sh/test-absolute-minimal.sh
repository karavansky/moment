#!/bin/bash
# Test absolute minimal config without any includes

echo "📋 Testing absolute minimal HTTPS config..."

echo ""
echo "1. Backing up current config..."
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup-$(date +%s)

echo ""
echo "2. Copying absolute minimal config..."
cp /home/hronop/node/quailbreeder/nginx-absolute-minimal.conf /etc/nginx/sites-available/default

echo ""
echo "3. Testing config..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "4. Restarting Nginx..."
    systemctl restart nginx
    sleep 2

    echo ""
    echo "5. Checking listening ports..."
    ss -tlnp | grep nginx

    echo ""
    echo "6. Testing port 443 specifically..."
    ss -tlnp | grep ":443"

    if ss -tlnp | grep -q ":443"; then
        echo ""
        echo "✅ SUCCESS! Port 443 is now listening!"
        echo ""
        echo "7. Testing HTTPS response..."
        curl -k https://localhost/ 2>&1
    else
        echo ""
        echo "❌ Port 443 still not listening"
        echo ""
        echo "Checking error log..."
        tail -20 /var/log/nginx/error.log
    fi
else
    echo "❌ Config test failed!"
fi

echo ""
echo "=== DONE ==="
