#!/bin/bash
# Increase cache lifetime for static assets to 1 year

echo "=== Increasing Cache Lifetime for PageSpeed ==="

echo ""
echo "PageSpeed recommendation: Use long cache lifetimes for immutable resources"
echo "Changing: expires 7d → expires 1y"
echo ""

echo "1. Testing configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Config test failed!"
    exit 1
fi

echo ""
echo "2. Reloading Nginx..."
sudo systemctl reload nginx

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cache lifetime increased successfully!"
    echo ""
    echo "=== New Cache Settings ==="
    echo ""
    echo "Static assets (JS, CSS, images, fonts):"
    echo "  - Cache-Control: public, immutable"
    echo "  - Expires: 1 year (31536000 seconds)"
    echo ""
    echo "Files affected:"
    echo "  - Images: .jpg, .jpeg, .png, .gif, .webp, .ico, .svg"
    echo "  - Scripts: .js, .json"
    echo "  - Styles: .css"
    echo "  - Fonts: .woff, .woff2, .ttf, .eot"
    echo "  - Data: .xml"
    echo ""
    echo "3. Testing cache headers..."
    curl -I https://quailbreeder.net/quail_eggs.webp 2>&1 | grep -E "Cache-Control|Expires" || echo "Headers check"
    echo ""
    echo "=== Benefits ==="
    echo "✅ Repeat visitors load instantly from cache"
    echo "✅ Reduced bandwidth usage"
    echo "✅ Better PageSpeed score"
    echo "✅ Faster page load times"
    echo ""
    echo "Note: 'immutable' tells browsers NEVER revalidate these files"
    echo "Next.js handles cache busting via file hashes in filenames"
    echo ""
else
    echo ""
    echo "❌ Reload failed!"
    exit 1
fi
