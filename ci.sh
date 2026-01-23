#!/bin/bash
set -e
echo "🔁 Running CI pipeline..."
git pull
echo "🔐 Checking Apple JWT expiration..."
node scripts/check-apple-jwt.js
JWT_STATUS=$?

if [ $JWT_STATUS -eq 2 ]; then
    echo "⚠️  Apple JWT was regenerated. The .env file has been updated."
    echo "🔄 You may want to commit the updated .env file."
fi

if [ $JWT_STATUS -eq 1 ]; then
    echo "❌ Apple JWT check failed! Continuing anyway..."
fi

echo "🗑️  Clearing Next.js cache..."
rm -rf .next
#npm run build

echo "🐳 Baue neues Docker-Image"
if ! docker build --no-cache -t moment:latest .; then
    echo "❌ Docker build failed! Aborting."
    exit 1
fi

echo "🚀 Starte neuen Container via Docker Compose"
# Обновляем сервис blog в стеке mailserver
# -f указывает путь к файлу docker-compose.yml
# --no-deps гарантирует, что не будут перезапущены связанные сервисы (например, postgres)
# --force-recreate пересоздает контейнер с новым образом
docker compose -f /home/hronop/mailserver/docker-compose.yml up -d --no-deps --force-recreate moment

echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✅ Done!"