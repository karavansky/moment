#!/bin/bash
# Proper verification for ECDSA certificates

echo "=== Verifying ECDSA Certificate and Key Match ==="

echo ""
echo "1. Extract public key from certificate..."
openssl x509 -in /etc/letsencrypt/live/quailbreeder.net/fullchain.pem -pubkey -noout > /tmp/cert-pubkey.pem

echo ""
echo "2. Extract public key from private key..."
openssl pkey -in /etc/letsencrypt/live/quailbreeder.net/privkey.pem -pubout > /tmp/key-pubkey.pem

echo ""
echo "3. Compare public keys..."
CERT_HASH=$(openssl dgst -sha256 /tmp/cert-pubkey.pem | cut -d' ' -f2)
KEY_HASH=$(openssl dgst -sha256 /tmp/key-pubkey.pem | cut -d' ' -f2)

echo "Certificate public key hash: $CERT_HASH"
echo "Private key public key hash:  $KEY_HASH"

if [ "$CERT_HASH" = "$KEY_HASH" ]; then
    echo ""
    echo "✅ Certificate and key MATCH CORRECTLY!"
    echo ""
    echo "The certificates are valid. Starting Nginx..."

    systemctl start nginx
    sleep 2

    echo ""
    echo "Checking ports..."
    ss -tlnp | grep nginx

    echo ""
    if ss -tlnp | grep -q ":443"; then
        echo "✅ SUCCESS! Port 443 is listening!"
        echo ""
        echo "Testing HTTPS..."
        curl -I https://quailbreeder.net/ 2>&1 | head -10
    else
        echo "❌ Port 443 not listening - checking error log..."
        tail -30 /var/log/nginx/error.log
    fi
else
    echo ""
    echo "❌ Certificate and key DO NOT MATCH"
    echo "There is a fundamental issue with certbot"
fi

# Cleanup
rm -f /tmp/cert-pubkey.pem /tmp/key-pubkey.pem

echo ""
echo "=== DONE ==="
