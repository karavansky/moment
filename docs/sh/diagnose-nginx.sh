#!/bin/bash
# Диагностика почему Nginx не слушает порт 443

echo "=== 1. Проверка конфигурации ==="
nginx -t

echo ""
echo "=== 2. Проверка сертификатов ==="
ls -la /etc/letsencrypt/live/quailbreeder.net/

echo ""
echo "=== 3. Проверка слушающих портов ==="
ss -tlnp | grep nginx
netstat -tlnp | grep nginx

echo ""
echo "=== 4. Проверка логов Nginx ==="
tail -50 /var/log/nginx/error.log | grep -i "443\|bind\|ssl\|certificate"

echo ""
echo "=== 5. Проверка systemd журнала ==="
journalctl -u nginx -n 100 --no-pager | grep -i "error\|fail\|443"

echo ""
echo "=== 6. Проверка firewall ==="
ufw status | grep 443

echo ""
echo "=== 7. Проверка кто использует порт 443 ==="
lsof -i :443

echo ""
echo "=== 8. Проверка running nginx config ==="
nginx -T 2>&1 | grep -A10 "listen.*443"

echo ""
echo "=== ГОТОВО ==="
