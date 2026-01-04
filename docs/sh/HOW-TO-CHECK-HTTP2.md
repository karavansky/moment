# Как проверить HTTP/2 в браузере

## Google Chrome / Chromium

### Способ 1: Network Tab (самый простой)

1. **Открой DevTools**
   - Windows/Linux: `F12` или `Ctrl + Shift + I`
   - macOS: `Cmd + Option + I`

2. **Перейди на вкладку Network**
   - Вверху будет вкладка "Network" (Сеть)

3. **Обнови страницу**
   - Нажми `F5` или `Ctrl + R` (macOS: `Cmd + R`)

4. **Найди колонку "Protocol"**
   - В списке запросов справа найди колонку **"Protocol"**
   - **Если колонки нет:**
     - Кликни правой кнопкой на заголовке любой колонки (Name, Status, Type, Size, Time)
     - В выпадающем меню найди **"Protocol"**
     - Поставь галочку ✓

5. **Проверь значение**
   - В колонке Protocol должно быть: **`h2`** ✅ (это HTTP/2)
   - Если видишь `http/1.1` ❌ - HTTP/2 не работает

### Способ 2: Response Headers

1. **Открой DevTools** → **Network**
2. **Обнови страницу**
3. **Кликни на первый запрос** (обычно это главная страница)
4. **Справа откроется панель**
5. **Перейди на вкладку "Headers"**
6. **Найди секцию "General"** (в самом верху)
7. **Смотри строку "Request Protocol":**
   - `HTTP/2` ✅
   - или `h2` ✅

### Способ 3: Chrome специальная страница

1. **Открой новую вкладку**
2. **Введи в адресную строку:**
   ```
   chrome://net-internals/#http2
   ```
3. **Найди свой сайт** `quailbreeder.net`
4. **Если в списке есть** → HTTP/2 работает ✅

---

## Firefox

### Способ 1: Network Tab

1. **Открой DevTools**
   - Windows/Linux: `F12` или `Ctrl + Shift + I`
   - macOS: `Cmd + Option + I`

2. **Вкладка "Network" (Сеть)**

3. **Обнови страницу** (`F5`)

4. **Найди колонку "Version"**
   - Кликни правой кнопкой на заголовке колонок
   - Включи **"Version"**

5. **Проверь:**
   - `2.0` или `HTTP/2` ✅

### Способ 2: Response Headers

1. **Network** → Кликни на запрос
2. **Справа панель "Headers"**
3. **Найди "Status":**
   - `200 HTTP/2` ✅

---

## Safari (macOS)

1. **Включи Developer Menu:**
   - Safari → Preferences → Advanced
   - ✓ Show Develop menu in menu bar

2. **Открой Web Inspector:**
   - `Cmd + Option + I`

3. **Вкладка "Network"**

4. **Обнови страницу**

5. **Кликни на запрос**

6. **Справа "Headers"**

7. **Смотри "Protocol":**
   - `h2` ✅

---

## Быстрая проверка через curl (терминал)

```bash
# Проверка HTTP/2
curl -I --http2 https://quailbreeder.net/ 2>&1 | grep "HTTP/"

# Должно показать:
# HTTP/2 200 ✅
```

---

## Что означают протоколы:

| Протокол | Значение |
|----------|----------|
| `h2` | HTTP/2 ✅ |
| `HTTP/2` | HTTP/2 ✅ |
| `2.0` | HTTP/2 ✅ |
| `h3` | HTTP/3 (QUIC) |
| `http/1.1` | HTTP/1.1 (старый) ❌ |

---

## Скриншот расположения (текстовое описание):

```
┌─────────────────────────────────────────────────┐
│ Chrome DevTools                                 │
├─────────────────────────────────────────────────┤
│ Elements  Console  Sources  [Network]  ...     │  ← Тут!
├─────────────────────────────────────────────────┤
│ Name         Status  Type    Size   Time  [Protocol] │  ← Колонка здесь
├─────────────────────────────────────────────────┤
│ quailbreeder.net  200  document  11.8KB  50ms  h2  │  ← h2 = HTTP/2!
│ quail_eggs.webp   200  image    323KB   120ms  h2  │
│ app.js            200  script   45KB    30ms   h2  │
└─────────────────────────────────────────────────┘
```

---

## Если НЕ видишь h2:

1. **Проверь, что сайт открыт через HTTPS** (не HTTP)
2. **Очисти кэш браузера:** `Ctrl + Shift + Del`
3. **Hard refresh:** `Ctrl + Shift + R` (macOS: `Cmd + Shift + R`)
4. **Проверь что Nginx перезагружен:**
   ```bash
   sudo systemctl status nginx
   ```
5. **Проверь конфиг Nginx:**
   ```bash
   grep "listen 443" /etc/nginx/sites-available/default
   # Должно быть: listen 443 ssl http2;
   ```

---

## Итог:

✅ **HTTP/2 работает** = в колонке Protocol видишь `h2`
❌ **HTTP/2 НЕ работает** = видишь `http/1.1`
