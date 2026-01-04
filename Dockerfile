# --- Этап 1: Сборка (Builder) ---
FROM node:20-alpine AS builder
WORKDIR /app

# Устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Собираем проект. 
# Благодаря output: 'standalone' в next.config.js, создастся папка .next/standalone
RUN npm run build

# --- Этап 2: Продакшен (Runner) ---
FROM node:20-alpine AS runner
WORKDIR /app

# Настройка окружения
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002

# Для работы standalone режима нам нужны только эти части:
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.env ./

# Пробрасываем порт
EXPOSE 3002

# ВАЖНО: В режиме standalone запуск идет напрямую через node, а не через npm
CMD ["node", "server.js"]
