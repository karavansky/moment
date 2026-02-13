# Архитектура module-level моста между Providers

## Проблема

Приложение имеет два отдельных React-дерева с независимыми `<Providers>`:

- `/` — корневая страница (`app/page.tsx`) — нужна для SEO
- `/{lang}/...` — языковые маршруты (`app/[lang]/layout.tsx`)

При навигации между ними React полностью размонтирует один `Providers` и монтирует другой. Весь state из `SchedulingContext` теряется.

## Решение: module-level переменная

```
contexts/SchedulingContext.tsx
─────────────────────────────
const appointmentOverrides: Record<string, Partial<Appointment>> = {}
```

Переменная объявлена **вне компонентов**, на уровне JS-модуля. Это даёт два ключевых свойства:

- **Переживает SPA-навигацию** — модуль загружается один раз и остаётся в памяти
- **Сбрасывается при F5** — перезагрузка страницы перезагружает модуль, переменная снова `{}`

## Две точки синхронизации

```
┌─────────────────────────────────────────────────────────┐
│              appointmentOverrides (module-level)         │
│    { "apt-123": { isOpen: true, openedAt: Date },       │
│      "apt-456": { isOpen: false, closedAt: Date } }     │
└────────────┬───────────────────────────┬────────────────┘
             │                           │
        1. WRITE                    2. READ
     (в каждом action)         (в loadMockData)
```

### 1. WRITE — в каждом action

Каждая функция записывает **только те поля, которые она меняет**. Spread сохраняет overrides от предыдущих функций:

```typescript
appointmentOverrides[appointmentId] = {
  ...appointmentOverrides[appointmentId],
  isOpen: true,
  openedAt: startDate,
}
```

### 2. READ — в loadMockData при монтировании SchedulingProvider

```typescript
const overrideKeys = Object.keys(appointmentOverrides)
if (overrideKeys.length > 0) {
  appointments = appointments.map(apt => {
    const overrides = appointmentOverrides[apt.id]
    if (overrides) {
      return { ...apt, ...overrides }
    }
    return apt
  })
}
```

Простой `{ ...apt, ...overrides }` мёржит все накопленные изменения.

## Защита от дублей (guard)

Каждый action имеет guard-проверку в начале `setState`:

```typescript
if (prev.appointments.find(apt => apt.id === appointmentId)?.isOpen) {
  return prev  // skip — без notification, без побочных эффектов
}
```

Когда `SchedulingProvider` восстанавливает state из `appointmentOverrides` (`isOpen: true`), повторный вызов `openAppointment` от `DemoNotificationWorker` — это no-op.

## Паттерн для новых функций

Все функции (`closeAppointment`, `pauseAppointment`, `addReport` и т.д.) следуют одной схеме:

```typescript
closeAppointment: (appointmentId: string) => {
  setState(prev => {
    const apt = prev.appointments.find(a => a.id === appointmentId)
    if (!apt?.isOpen) return prev  // guard

    const closedAt = new Date()

    // 1. WRITE — мёржим с существующими overrides
    appointmentOverrides[appointmentId] = {
      ...appointmentOverrides[appointmentId],
      isOpen: false,
      closedAt,
    }

    // 2. Notification (через queueMicrotask, НЕ внутри setState)
    queueMicrotask(() => addNotification({...}))

    // 3. State update
    return {
      ...prev,
      appointments: prev.appointments.map(a =>
        a.id === appointmentId ? { ...a, isOpen: false, closedAt } : a
      ),
    }
  })
}
```

### Чеклист при добавлении новой функции

1. **Guard** — проверка в начале `setState`, чтобы не дублировать действие
2. **WRITE** — `appointmentOverrides[id] = { ...appointmentOverrides[id], ...newFields }`
3. **Notification** — через `queueMicrotask()`, не внутри `setState`
4. **State update** — `return { ...prev, appointments: prev.appointments.map(...) }`

## Навигация из toast-уведомлений

`NotificationObserver` добавляет `/{lang}` префикс к href из notification, так как actions хранят пути без языкового префикса (`/map/{id}`), а маршруты приложения требуют его (`/de/map/{id}`).
