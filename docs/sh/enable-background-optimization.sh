#!/bin/bash
# Enable Next.js Image Optimizer for background images

echo "=== Enabling Image Optimization for Backgrounds ==="
echo ""
echo "Removing 'unoptimized' prop from background images"
echo "Adding quality={75} and sizes=\"100vw\""
echo ""

cd /home/hronop/node/quailbreeder

# Backup
cp app/page.tsx app/page.tsx.backup-$(date +%Y%m%d-%H%M%S)

# Replace unoptimized with quality and sizes for Desktop
sed -i '/quail_eggs.webp/,/className="object-cover"/{
  s/unoptimized/quality={75}\n          sizes="100vw"/
}' app/page.tsx

# Replace unoptimized with quality and sizes for Mobile
sed -i '/quail_eggs_vertical.webp/,/className="object-cover object-center scale-115"/{
  s/unoptimized/quality={75}\n          sizes="100vw"/
}' app/page.tsx

echo "✅ Changes applied to app/page.tsx"
echo ""
echo "Next steps:"
echo "1. Rebuild the app: npm run build"
echo "2. Restart Docker container"
echo ""
echo "This will:"
echo "  - Resize images to actual display size"
echo "  - Reduce quality to 75% (acceptable for backgrounds)"
echo "  - Save ~150 KiB per image"
echo ""
echo "Backup saved to: app/page.tsx.backup-*"
echo ""
