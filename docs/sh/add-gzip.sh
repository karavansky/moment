#!/bin/bash
# Скрипт для добавления Gzip в /etc/nginx/nginx.conf

echo "Добавление Gzip compression в /etc/nginx/nginx.conf..."

# Создать файл с gzip настройками
cat > /tmp/gzip-config << 'EOF'

	# Gzip compression settings
	gzip on;
	gzip_vary on;
	gzip_proxied any;
	gzip_comp_level 6;
	gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
	gzip_disable "msie6";
	gzip_min_length 256;
EOF

# Проверить, есть ли уже gzip
if grep -q "gzip on" /etc/nginx/nginx.conf; then
    echo "Gzip уже включен в nginx.conf"
else
    echo "Добавляем Gzip в http блок..."
    # Добавить перед include /etc/nginx/sites-enabled/*;
    sed -i '/include \/etc\/nginx\/sites-enabled/i\
	# Gzip compression settings\
	gzip on;\
	gzip_vary on;\
	gzip_proxied any;\
	gzip_comp_level 6;\
	gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;\
	gzip_disable "msie6";\
	gzip_min_length 256;\
' /etc/nginx/nginx.conf
    echo "Gzip добавлен!"
fi

echo "Проверка конфигурации..."
nginx -t
