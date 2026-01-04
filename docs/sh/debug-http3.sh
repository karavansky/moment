#!/bin/bash
# Debug HTTP/3 connection issues

echo "=== Debugging HTTP/3 (QUIC) Connection ==="

echo ""
echo "1. Check Nginx is listening on UDP 443..."
ss -ulnp | grep ":443"

echo ""
echo "2. Check firewall allows UDP 443..."
ufw status verbose | grep "443"

echo ""
echo "3. Check Nginx config has QUIC listeners..."
nginx -T 2>&1 | grep -A2 "listen.*443"

echo ""
echo "4. Test local QUIC connection..."
# Try to connect locally
timeout 2 nc -u -z localhost 443 && echo "✅ Local UDP 443 reachable" || echo "⚠️  Local UDP 443 not responding"

echo ""
echo "5. Check if HTTP/3 module is loaded..."
nginx -V 2>&1 | grep -i "http.*v3\|quic"

echo ""
echo "6. Check Nginx error log for QUIC issues..."
tail -50 /var/log/nginx/error.log | grep -i "quic\|http3" || echo "No QUIC/HTTP3 errors in log"

echo ""
echo "7. Verify SSL early data (0-RTT) config..."
grep -r "ssl_early_data" /etc/letsencrypt/ /etc/nginx/ 2>/dev/null || echo "ssl_early_data not configured"

echo ""
echo "8. Check if provider/ISP blocks UDP 443..."
echo "Note: Some cloud providers block UDP 443 by default"
echo "Check your hosting provider's firewall/security groups"

echo ""
echo "=== Possible Issues ==="
echo "1. Cloud provider firewall blocking UDP 443"
echo "2. Network路由器 or ISP blocking QUIC"
echo "3. Nginx compiled without http_v3_module (unlikely since we see it in -V)"
echo "4. SSL configuration incompatible with QUIC"
echo ""
echo "=== DONE ==="
