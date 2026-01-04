#!/bin/bash
# Comprehensive diagnostic for why port 443 won't bind

echo "=== 1. Check what's using port 443 ==="
lsof -i :443
fuser 443/tcp 2>&1

echo ""
echo "=== 2. Certificate file permissions ==="
ls -la /etc/letsencrypt/live/quailbreeder.net/
echo ""
ls -la /etc/letsencrypt/archive/quailbreeder.net/

echo ""
echo "=== 3. Check SSL config files ==="
ls -la /etc/letsencrypt/options-ssl-nginx.conf
ls -la /etc/letsencrypt/ssl-dhparams.pem

echo ""
echo "=== 4. Test certificate validity ==="
openssl x509 -in /etc/letsencrypt/live/quailbreeder.net/fullchain.pem -noout -text | grep -A2 "Validity"

echo ""
echo "=== 5. Test private key ==="
openssl pkey -in /etc/letsencrypt/live/quailbreeder.net/privkey.pem -check 2>&1

echo ""
echo "=== 6. Check if cert and key match ==="
CERT_MODULUS=$(openssl x509 -noout -modulus -in /etc/letsencrypt/live/quailbreeder.net/fullchain.pem | openssl md5)
KEY_MODULUS=$(openssl pkey -in /etc/letsencrypt/live/quailbreeder.net/privkey.pem -pubout -outform PEM | openssl md5)
echo "Cert modulus: $CERT_MODULUS"
echo "Key modulus:  $KEY_MODULUS"
if [ "$CERT_MODULUS" = "$KEY_MODULUS" ]; then
    echo "✅ Certificate and key MATCH"
else
    echo "❌ Certificate and key DO NOT MATCH"
fi

echo ""
echo "=== 7. Check Nginx parsed config ==="
nginx -T 2>&1 | grep -A20 "server_name quailbreeder.net"

echo ""
echo "=== 8. Check SELinux status ==="
getenforce 2>/dev/null || echo "SELinux not installed"

echo ""
echo "=== 9. Check AppArmor status ==="
aa-status 2>/dev/null | grep nginx || echo "AppArmor not blocking nginx or not installed"

echo ""
echo "=== 10. Try binding manually to 443 (will timeout in 2 sec) ==="
timeout 2 nc -l 443 2>&1 && echo "✅ Can bind to 443" || echo "❌ Cannot bind to 443"

echo ""
echo "=== 11. Check systemd journal for binding errors ==="
journalctl -u nginx --since "5 minutes ago" --no-pager | grep -i "bind\|443\|address\|permission"

echo ""
echo "=== DONE ==="
