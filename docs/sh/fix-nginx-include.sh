#!/bin/bash
# Add sites-enabled include to nginx.conf

echo "=== Fixing Nginx Main Config ==="

echo ""
echo "1. Backing up nginx.conf..."
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup-$(date +%s)

echo ""
echo "2. Adding sites-enabled include..."
sed -i '/include \/etc\/nginx\/conf.d\/\*.conf;/a\    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf

echo ""
echo "3. Verifying the change..."
grep -A1 "conf.d" /etc/nginx/nginx.conf

echo ""
echo "4. Testing config..."
nginx -t

if [ $? -eq 0 ]; then
    echo ""
    echo "5. Restarting Nginx..."
    systemctl restart nginx
    sleep 2

    echo ""
    echo "6. Checking ports..."
    ss -tlnp | grep nginx

    echo ""
    if ss -tlnp | grep -q ":443"; then
        echo ""
        echo "🎉🎉🎉 SUCCESS! Port 443 is NOW LISTENING! 🎉🎉🎉"
        echo ""
        echo "7. Testing HTTPS..."
        curl -I https://quailbreeder.net/ 2>&1 | head -10
    else
        echo ""
        echo "❌ Port 443 still not listening"
        tail -20 /var/log/nginx/error.log
    fi
else
    echo ""
    echo "❌ Config test failed"
fi

echo ""
echo "=== DONE ==="
