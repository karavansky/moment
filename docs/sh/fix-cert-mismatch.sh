#!/bin/bash
# Fix certificate/key mismatch by forcing complete renewal

echo "=== Fixing Certificate/Key Mismatch ==="

echo ""
echo "1. Checking current certificate details..."
openssl x509 -in /etc/letsencrypt/live/quailbreeder.net/fullchain.pem -noout -text | grep "Public Key Algorithm"
openssl pkey -in /etc/letsencrypt/live/quailbreeder.net/privkey.pem -text -noout | grep "Private-Key"

echo ""
echo "2. Stopping Nginx..."
systemctl stop nginx

echo ""
echo "3. Deleting current certificates to force clean renewal..."
rm -rf /etc/letsencrypt/live/quailbreeder.net/
rm -rf /etc/letsencrypt/archive/quailbreeder.net/
rm -f /etc/letsencrypt/renewal/quailbreeder.net.conf

echo ""
echo "4. Obtaining fresh certificates..."
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@quailbreeder.net \
    -d quailbreeder.net \
    --key-type ecdsa \
    --elliptic-curve secp256r1

echo ""
echo "5. Verifying new certificates match..."
CERT_MOD=$(openssl x509 -noout -modulus -in /etc/letsencrypt/live/quailbreeder.net/fullchain.pem 2>/dev/null | openssl md5)
KEY_MOD=$(openssl pkey -in /etc/letsencrypt/live/quailbreeder.net/privkey.pem -pubout -outform PEM 2>/dev/null | openssl md5)
echo "Cert modulus: $CERT_MOD"
echo "Key modulus:  $KEY_MOD"

if [ "$CERT_MOD" = "$KEY_MOD" ]; then
    echo "✅ Certificate and key MATCH!"

    echo ""
    echo "6. Starting Nginx..."
    systemctl start nginx

    echo ""
    echo "7. Checking ports..."
    sleep 2
    ss -tlnp | grep nginx

    echo ""
    if ss -tlnp | grep -q ":443"; then
        echo "✅ SUCCESS! Port 443 is listening!"
        echo ""
        echo "Testing HTTPS..."
        curl -I https://quailbreeder.net/ 2>&1 | head -5
    else
        echo "❌ Port 443 still not listening"
        tail -20 /var/log/nginx/error.log
    fi
else
    echo "❌ Certificates STILL don't match!"
    echo "This indicates a deeper certbot issue."
fi

echo ""
echo "=== DONE ==="
