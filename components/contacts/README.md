# Contacts Module - Brevo Style

Полнофункциональный модуль управления контактами в стиле Brevo CRM с боковым меню и таблицей контактов.

## Компоненты

### 1. Sidebar (Боковое меню)
Навигационное меню в стиле Brevo с возможностью сворачивания.

**Особенности:**
- 🎯 Активная индикация текущей страницы
- 🔄 Сворачивание/разворачивание меню
- 📂 Группировка разделов (CRM, Marketing и т.д.)
- 👤 Профиль пользователя в футере
- 🎨 Адаптивный дизайн

### 2. ContactsTable (Таблица контактов)
Таблица контактов с полным функционалом управления.

**Особенности:**
- ✅ Выбор контактов (одиночный и множественный)
- 🔍 Поиск по email
- 📊 Пагинация с настраиваемым количеством строк
- 🎨 Настройка видимых колонок
- 📱 Адаптивный дизайн
- 🏷️ Отображение статусов подписки (Email, SMS)
- 🚫 Индикация блокированных контактов
- 📅 Отображение даты последнего изменения

### 3. ContactsLayout
Layout компонент, объединяющий Sidebar и основной контент.

## Использование

### Полный пример с Layout

```tsx
import ContactsLayout from '@/components/contacts/ContactsLayout'
import ContactsTable, { Contact } from '@/components/contacts/ContactsTable'

const contacts: Contact[] = [
  {
    id: '1',
    email: 'user@example.com',
    subscribed: {
      email: true,
      sms: false,
    },
    blocklisted: false,
    landlineNumber: '+1234567890',
    lastChanged: new Date('2025-12-21'),
  },
]

export default function ContactsPage() {
  return (
    <ContactsLayout>
      <ContactsTable
        contacts={contacts}
        onCreateContact={() => console.log('Create')}
        onImportContacts={() => console.log('Import')}
      />
    </ContactsLayout>
  )
}
```

### Использование только таблицы (без sidebar)

```tsx
import ContactsTable, { Contact } from '@/components/contacts/ContactsTable'

export default function MyPage() {
  return (
    <ContactsTable
      contacts={contacts}
      onCreateContact={() => console.log('Create')}
      onImportContacts={() => console.log('Import')}
    />
  )
}
```

### Использование только Sidebar

```tsx
import Sidebar from '@/components/contacts/Sidebar'

export default function MyLayout({ children }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

## Props

### ContactsTableProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `contacts` | `Contact[]` | ✅ | Массив контактов для отображения |
| `onCreateContact` | `() => void` | ❌ | Callback при нажатии "Create a contact" |
| `onImportContacts` | `() => void` | ❌ | Callback при нажатии "Import contacts" |

### Contact Type

```typescript
interface Contact {
  id: string                    // Уникальный ID контакта
  email: string                 // Email адрес
  subscribed: {                 // Статусы подписки
    email: boolean
    sms: boolean
  }
  blocklisted: boolean          // В черном списке?
  landlineNumber?: string       // Номер телефона (опционально)
  lastChanged: Date             // Дата последнего изменения
}
```

## Функциональность

### Поиск
- Поиск работает по email адресу
- Регистронезависимый поиск
- Результаты обновляются в реальном времени

### Пагинация
- Настраиваемое количество строк: 10, 20, 50, 100
- Навигация по страницам
- Отображение текущего диапазона записей

### Выбор контактов
- Checkbox для выбора отдельных контактов
- Checkbox в заголовке для выбора всех на странице
- Indeterminate состояние при частичном выборе

### Настройка колонок
- Кнопка "Customize columns" для выбора видимых колонок
- Доступные колонки:
  - CONTACT (email)
  - SUBSCRIBED (статусы подписки)
  - BLOCKLISTED (в черном списке)
  - LANDLINE_NUMBER (номер телефона)
  - LAST CHANGED (дата изменения)

## Стилизация

Компонент использует HeroUI компоненты и адаптируется к текущей теме (light/dark).

### Кастомизация

Вы можете переопределить стили через `classNames` prop компонентов HeroUI:

```tsx
<Table
  classNames={{
    th: 'bg-primary-100 text-primary-700',
    td: 'border-b border-primary-200',
  }}
>
```

## Интеграция с API

Пример интеграции с backend:

```tsx
'use client'

import { useState, useEffect } from 'react'
import ContactsTable, { Contact } from '@/components/contacts/ContactsTable'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchContacts() {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      setContacts(data)
      setLoading(false)
    }
    fetchContacts()
  }, [])

  if (loading) return <div>Loading...</div>

  return <ContactsTable contacts={contacts} />
}
```

## Будущие улучшения

- [ ] Сортировка по колонкам
- [ ] Фильтры (по статусу подписки, blocklisted и т.д.)
- [ ] Экспорт контактов
- [ ] Массовые действия (удаление, изменение статуса)
- [ ] Drag & drop для загрузки файлов
- [ ] Inline редактирование контактов
