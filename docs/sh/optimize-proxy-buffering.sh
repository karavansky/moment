#!/bin/bash
# Optimize proxy buffering for large images (323KB webp files)

echo "=== Optimizing Proxy Buffering for Large Images ==="

echo ""
echo "Creating optimized site config..."

cat > /tmp/default-optimized << 'EOF'
# Add to server block for quailbreeder.net

# Proxy buffering optimization for Next.js large images
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 512k;  # 8 buffers of 512KB each = 4MB total
proxy_busy_buffers_size 1m;
proxy_max_temp_file_size 0;  # Disable temp files, use only buffers
EOF

echo ""
cat /tmp/default-optimized

echo ""
echo "These settings should be added to /etc/nginx/sites-available/default"
echo "inside the 'server { ... }' block that handles quailbreeder.net"
echo ""
echo "This will:"
echo "  - Use 4MB of RAM for buffering (enough for 323KB images)"
echo "  - Disable temp files (proxy_max_temp_file_size 0)"
echo "  - Prevent disk I/O during image serving"
echo ""
echo "Would you like me to add this automatically? (y/n)"
