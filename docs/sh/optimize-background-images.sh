#!/bin/bash
# Optimize background images for PageSpeed

echo "=== Optimizing Background Images ==="
echo ""
echo "Current issue:"
echo "  - quail_eggs.webp: 1533x1080 (187 KiB) → needs 1408x940"
echo "  - quail_eggs_vertical.webp: similar issue"
echo ""
echo "Solution: Use cwebp to optimize with quality 75"
echo ""

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "Installing webp tools..."
    sudo apt-get update
    sudo apt-get install -y webp
fi

cd /home/hronop/node/quailbreeder/public

echo "1. Backing up original files..."
if [ ! -f quail_eggs.webp.original ]; then
    cp quail_eggs.webp quail_eggs.webp.original
fi
if [ ! -f quail_eggs_vertical.webp.original ]; then
    cp quail_eggs_vertical.webp quail_eggs_vertical.webp.original
fi

echo ""
echo "2. Optimizing quail_eggs.webp..."
echo "   Original size: $(du -h quail_eggs.webp | cut -f1)"
cwebp -q 75 -resize 1408 940 quail_eggs.webp.original -o quail_eggs.webp.new
mv quail_eggs.webp.new quail_eggs.webp
echo "   New size: $(du -h quail_eggs.webp | cut -f1)"

echo ""
echo "3. Optimizing quail_eggs_vertical.webp..."
echo "   Original size: $(du -h quail_eggs_vertical.webp | cut -f1)"
# Vertical: keep aspect ratio, reduce quality
cwebp -q 75 -resize 0 1200 quail_eggs_vertical.webp.original -o quail_eggs_vertical.webp.new
mv quail_eggs_vertical.webp.new quail_eggs_vertical.webp
echo "   New size: $(du -h quail_eggs_vertical.webp | cut -f1)"

echo ""
echo "✅ Images optimized!"
echo ""
echo "Results:"
ls -lh quail_eggs*.webp | grep -v original
echo ""
echo "Originals saved as:"
echo "  - quail_eggs.webp.original"
echo "  - quail_eggs_vertical.webp.original"
echo ""
echo "To restore originals:"
echo "  cp public/quail_eggs.webp.original public/quail_eggs.webp"
echo ""
