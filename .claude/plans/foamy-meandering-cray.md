# Admin Users Management — UsersTable + UserDetail Modal

## Context
Нужно добавить управление пользователями в админ-панель (`app/[lang]/admin/`). Админ должен видеть всех зарегистрированных пользователей, их статус верификации email, провайдер авторизации, и иметь возможность просматривать/редактировать через модальное окно. Паттерн берём из `WorkersTable` + `WorkerDetail`.

## Файлы для создания

### 1. `lib/users.ts` — добавить функции
- `getAllUsers()` — SELECT всех пользователей (без passwordHash)
- `updateUser(userID, fields)` — обновление name, email, isAdmin, emailVerified

### 2. `app/api/admin/users/route.ts` — API endpoint
- **GET** — список всех пользователей (admin only, паттерн из `app/api/admin/tickets/route.ts`)
- **PATCH** — обновление пользователя (admin only)
- **DELETE** — удаление пользователя (admin only)

### 3. `components/UsersTable.tsx` — таблица пользователей
Паттерн из `components/WorkersTable.tsx`:
- Колонки: User (name), Email, Provider, Email Verified, Admin, Registered
- Поиск по name/email
- Фильтр по провайдеру (Google, Apple, Credentials)
- Фильтр по статусу верификации
- Сортировка
- `onRowClick` для открытия деталей
- Анимация строк через framer-motion
- HeroUI компоненты (Chip для статусов, Spinner, TextField/InputGroup для поиска)

### 4. `app/[lang]/admin/UserDetail.tsx` — просмотр/редактирование пользователя
Паттерн из `app/[lang]/staff/WorkerDetail.tsx`:
- Табы: Overview, Sessions
- **Overview**: имя, email, провайдер (readonly), emailVerified (toggle), isAdmin (toggle), дата регистрации
- **Sessions**: список активных сессий пользователя (из `getUserSessions`), кнопка "Terminate" для удаления сессии, кнопка "Terminate All" для удаления всех сессий
- Кнопка "Back" для возврата к таблице
- Форма редактирования через HeroUI Form/TextField
- Сохранение через PATCH `/api/admin/users`

### 5. `app/[lang]/admin/UsersView.tsx` — контейнер (Table ↔ Detail)
Паттерн из `app/[lang]/staff/WorkersView.tsx`:
- AnimatePresence для переключения между таблицей и деталями
- State: `selectedUser` / `null`

### 6. `app/[lang]/admin/DashboardView.tsx` — добавить таб "Users"
- Новая кнопка "Users" рядом с Tickets, Seaweed, Dictionary
- Новый ref `usersRef` для индикатора
- Рендер `<UsersView />` при `activeTab === 'users'`

## Существующие функции для переиспользования
- `lib/users.ts`: `getUserByEmail()`, `getUserById()` — проверка админа в API
- `lib/sessions.ts`: `getUserSessions()`, `deleteSession()`, `deleteAllUserSessions()` — управление сессиями
- `lib/auth.ts`: `auth()` — проверка сессии в API
- `components/icons.tsx`: `SearchIcon`, `ChevronDownIcon` — иконки для таблицы
- `lucide-react`: `Users`, `Undo2`, `Shield`, `Mail` — иконки

## Verification
1. Открыть `/admin` → должен появиться таб "Users"
2. Кликнуть "Users" → таблица с пользователями (загрузка через API)
3. Поиск по имени/email
4. Фильтрация по провайдеру и статусу верификации
5. Клик по строке → UserDetail с данными пользователя
6. Изменить isAdmin/emailVerified → сохранить → проверить в БД
7. Sessions таб → видны активные сессии, кнопка terminate работает
8. Не-админ → redirect на `/`