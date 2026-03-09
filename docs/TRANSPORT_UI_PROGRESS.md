# Transport System UI - Progress Report

## ✅ Выполнено: Workflow 1 - Администратор создает поездку

### 1. Radio Button для выбора типа записи

**Файл:** [components/scheduling/AppView.tsx](../components/scheduling/AppView.tsx)

Добавлен выбор типа записи с двумя вариантами:
- **Визит** (type=0) - Стандартная встреча с клиентом
- **Поездка** (type=1) - Транспортная поездка

**Особенности:**
- При переключении на "Поездка" автоматически очищаются выбранные услуги (services)
- При переключении на "Визит" восстанавливаются ранее выбранные услуги
- Используются нативные HTML radio inputs для совместимости

### 2. RouteEditor - Редактор маршрутов

**Файл:** [components/scheduling/RouteEditor.tsx](../components/scheduling/RouteEditor.tsx)

Создан компонент для управления маршрутами с расширенными возможностями:

#### Функционал:
✅ **Добавление пунктов:**
- Начальный и конечный пункты (минимум 2)
- Промежуточные пункты между любыми существующими
- Кнопка "Добавить пункт в конец"

✅ **Удаление пунктов:**
- Возможность удалить любой пункт (кроме случая, когда остается меньше 2)
- Минимум сохраняется 2 пункта (откуда → куда)

✅ **Drag & Drop:**
- Перетаскивание пунктов для изменения последовательности
- Визуальная индикация при перетаскивании
- GripVertical иконка для удобства захвата

✅ **UI/UX:**
- Нумерация пунктов (1, 2, 3...)
- Placeholder подсказки: "Пункт отправления", "Промежуточный пункт", "Пункт прибытия"
- Кнопка `+` между пунктами для добавления промежуточных
- Кнопка `🗑️` для удаления пунктов
- Информационный блок с подсказками по использованию

### 3. Интеграция с типами TypeScript

**Файл:** [types/scheduling.ts](../types/scheduling.ts)

Обновлены типы:

```typescript
// Пункт маршрута
export interface RoutePoint {
  id: string
  address: string
  lat?: number  // Для будущей геокодировки
  lng?: number  // Для будущей геокодировки
}

// Обновлен Appointment
export interface Appointment {
  // ... существующие поля
  type?: AppointmentType // 0 = визит, 1 = поездка
  routes?: RoutePoint[] // Маршрут для type=1
  orderID?: string // Связь с order при сохранении
}
```

## Логика работы маршрутов

### Преобразование в таблицу routes

Когда пользователь задает маршрут из N пунктов:
```
Пункт 1 → Пункт 2 → Пункт 3
```

В базу данных записывается (N-1) записей:

```javascript
// Route 1
{
  sequence: 1,
  pickupAddress: "Пункт 1",
  dropoffAddress: "Пункт 2"
}

// Route 2
{
  sequence: 2,
  pickupAddress: "Пункт 2",
  dropoffAddress: "Пункт 3"
}
```

### Пример: Пользователь добавляет промежуточный пункт

**Было:**
```
Пункт A → Пункт B
```

**Пользователь добавляет Пункт C между A и B:**
```
Пункт A → Пункт C → Пункт B
```

**Результат в routes:**
```javascript
[
  { sequence: 1, pickupAddress: "A", dropoffAddress: "C" },
  { sequence: 2, pickupAddress: "C", dropoffAddress: "B" }
]
```

## Условная логика отображения

### В AppView.tsx:

```typescript
const isTransportType = (formData.type ?? 0) === 1

// Services - только для типа "Визит"
{!isTransportType && (
  <ServiceSelect ... />
)}

// RouteEditor - только для типа "Поездка"
{isTransportType && (
  <RouteEditor
    points={formData.routes || []}
    onChange={(routes) => setFormData({...prev, routes})}
  />
)}
```

## Следующие шаги

### 1. Интерфейс диспетчера
- [ ] Страница `/dispatcher` с картой
- [ ] Список заказов со статусами (PENDING, CREATED, ASSIGNED, ...)
- [ ] Назначение водителей на заказы
- [ ] Отображение маршрутов на карте

### 2. Mock Data
- [ ] Добавить в `lib/transport-mock-data.ts`
- [ ] Интеграция с SchedulingContext
- [ ] Тестовые данные для UI

### 3. Сохранение данных
- [ ] При сохранении appointment с type=1:
  - Создать order через `/api/transport/orders`
  - Преобразовать routes в записи для `/api/transport/routes`
  - Установить appointmentID в order

### 4. Workflow 2 (позже)
- [ ] Интерфейс клиента для создания заказов
- [ ] PWA для водителей

## Технические детали

### Файлы изменены:
1. ✅ `components/scheduling/AppView.tsx` - добавлен radio button и RouteEditor
2. ✅ `components/scheduling/RouteEditor.tsx` - новый компонент
3. ✅ `types/scheduling.ts` - добавлены RoutePoint и routes в Appointment

### Зависимости:
- HeroUI: Button, Input, Separator
- Lucide Icons: Plus, Trash2, GripVertical
- React: useState, useEffect

### Состояние formData:
```typescript
{
  type: 0 | 1,
  routes: RoutePoint[], // Только для type=1
  services: Service[], // Только для type=0
  // ... остальные поля
}
```

---

**Дата:** 2026-03-08
**Статус:** ✅ Workflow 1 UI готов к тестированию
