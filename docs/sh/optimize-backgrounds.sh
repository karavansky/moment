#!/bin/bash
# Optimize background images with lower quality

echo "=== Optimizing Background Images ==="

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "Installing webp tools..."
    sudo apt-get update && sudo apt-get install -y webp
fi

echo ""
echo "1. Backing up originals..."
cp public/quail_eggs.webp public/quail_eggs.webp.original
cp public/quail_eggs_vertical.webp public/quail_eggs_vertical.webp.original

echo ""
echo "2. Optimizing quail_eggs.webp (quality 50)..."
cwebp -q 50 public/quail_eggs.webp.original -o public/quail_eggs.webp
ls -lh public/quail_eggs.webp

echo ""
echo "3. Optimizing quail_eggs_vertical.webp (quality 50)..."
cwebp -q 50 public/quail_eggs_vertical.webp.original -o public/quail_eggs_vertical.webp
ls -lh public/quail_eggs_vertical.webp

echo ""
echo "=== Size Comparison ==="
echo "Before:"
ls -lh public/quail_eggs*.original
echo ""
echo "After:"
ls -lh public/quail_eggs.webp public/quail_eggs_vertical.webp

echo ""
echo "✅ Done! Now rebuild and deploy with ./ci.sh"
