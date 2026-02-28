# Архитектура Системы Уведомлений (Notification System Architecture)

Данный документ описывает, как работают глобальные уведомления (Toasts) в приложении Moment, как они связаны с Backend (через SSE) и какие существуют проблемы в текущей реализации.

## 1. Как работает `components/NotificationObserver.tsx`

`NotificationObserver` — это "невидимый" фоновый компонент, который монтируется на уровне корня приложения (в `Providers.tsx`). Его задача — связывать хранилище данных уведомлений (`NotificationContext`) с UI-компонентом HeroUI Toast.

### Алгоритм работы:

1. **Слушатель Context'а:** Компонент подписан на массив `notifications` из `NotificationContext`.
2. **Фильтрация новых:** При каждом изменении массива он выбирает уведомления, у которых `!isRead` и которых еще нет в локальном Set-кэше `processedIds`.
3. **Очередь (Batching):** Чтобы не заспамить экран, он берет максимум 3 новых уведомления за раз.
4. **Таймауты и Microtasks:** Для каждого уведомления создается `setTimeout` (с задержкой 100ms, 400ms, 700ms...), внутри которого дергается `queueMicrotask`. Это необходимо, чтобы дать браузеру время на отрисовку и избежать "затыков" основного потока.
5. **Вызов Toast UI:** В зависимости от `notif.type` вызывается функция `@heroui/react` `toast()`, `toast.success()`, `toast.warning()` и т.д.
6. **Actions & Кнопки:** Если у уведомления есть свойство `actionProps` (например, кнопка "View"), оно прокидывается в Toast. Кнопке привязывается функция `onPress`, которая перехватывает клик, перенаправляет пользователя через `router.push()`, закрывает Toast (`toast.close`) и помечает уведомление как прочитанное (`markNotificationAsRead`).
7. **Очистка памяти:** Компонент отслеживает удаленные или прочитанные уведомления и корректно удаляет их из `processedIds` и очищает зависшие таймеры.

---

## 2. Связь с Backend и SSE (Server-Sent Events)

Поток данных для глобального уведомления выглядит так:
`PostgreSQL (pg_notify) -> Node.js Backend -> SSE Connection -> useSchedulingEvents.ts -> SchedulingContext.tsx -> NotificationContext.tsx -> NotificationObserver.tsx -> HeroUI Toast`

### Места, генерирующие системные Toasts (через `addNotification`):

1. **Новое назначение (Appointment Created)**
   - **Где:** `SchedulingContext.tsx`
   - **Условие:** Если пришло SSE-событие `appointment_created` и текущий авторизованный работник (`myWorkerID`) находится в списке `workerIds` этого назначения.
   - **Кнопка:** "View" (ведет на `/dienstplan`).
2. **Отмена назначения (Appointment Deleted)**
   - **Где:** `SchedulingContext.tsx`
   - **Условие:** Событие `appointment_deleted` + назначение было привязано к текущему работнику.
   - **Цвет:** Warning (Без кнопки перехода).
3. **Старт визита (Starting Appointment!)**
   - **Где:** `SchedulingContext.tsx`
   - **Условие:** Работник отмечает визит как `isOpen = true` (нажатие Start на мобилке). Событие прилетает по SSE Директору (или диспетчеру).
   - **Кнопка:** "See on map" (ведет на карту к геометке клиента).
4. **Окончание визита (Appointment Finished!)**
   - **Где:** `SchedulingContext.tsx`
   - **Условие:** Работник завершает визит `isOpen = false`. SSE сообщает об этом диспетчеру.
   - **Действие:** Toast зеленого цвета.
5. **Демонстрационный режим (Demo Worker)**
   - **Где:** `DemoNotificationWorker.tsx`
   - **Условие:** Запускается, если нет авторизованного юзера (не-Live mode). Генерирует фейковые уведомления раз в минуту в маркетинговых целях.

---

## 3. Локальные (ручные) Toasts

Во многих местах разработчики используют вызов `toast.success()` напрямую, **минуя `NotificationContext`**. Это нормально для сиюминутных обратных связей (например, "Сохранено"), которые не нужно хранить в истории уведомлений dropdown'а.

_Список прямых вызовов `toast(...)`:_

- `AppointmentReport.tsx`: Ошибки загрузки фото, ошибки сохранения отчета (`toast.danger`).
- `WorkerDetail.tsx`: Успешно активирован/архивирован/удален работник, либо ошибка действия.
- `ClientDetail.tsx`: Аналогично для клиента (архивация, активация, удаление).
- `useAppVersion.ts`: Системное уведомление о выходе новой версии PWA (с просьбой перезагрузить страницу).

---

## 4. Текущие проблемы и некорректности реализации (Bugs to fix)

1. **Гонка `toastKey` в `NotificationObserver`:**
   Код назначает локальную `let toastKey;`, а затем передает её в `actionProps.onPress`. Проблема в том, что `toastKey = toast.success(...)` выполнится _после_ создания объекта `options`. Теоретически, если пользователь кликнет мгновенно, `toastKey` может быть undefined в замыкании на долю миллисекунды.
2. **Сломанная навигация (`href` в `actionProps`):**
   В коде `NotificationObserver` написано:
   ```typescript
   href: notif.actionProps.href.startsWith(`/${lang}/`) ? ... : `/${lang}${...}`
   ```
   Но если HeroUI Toast получает `href`, он оборачивает кнопку в нативный тег `<a>` и делает хард-релоад (или параллельный роут), вместо того чтобы использовать Next.js `router.push()`. Нужно удалять свойство `href` из объекта `actionProps` перед передачей его в `toast(...)`, оставляя только `onPress`.
3. **Отсутствие стандартизированного Payload для Backend:**
   Прямо сейчас SSE шлет только _type_ события (например, `appointment_updated`), а `SchedulingContext` сам придумывает текст и заголовок русского/английского языка. Это ломает локализацию (тексты захардкожены на английском) и усложняет жизнь backend'у.
4. **Утечка памяти в таймерах:**
   Если уведомлений придет сразу 20 штук, `setTimeout` с `index * 300` растянет выполнение на 6 секунд. Если пользователь быстро уйдет со страницы, таймеры могут сработать некорректно.

---

## 5. План унификации (Идеальный сценарий)

Нам необходимо перейти от локально захардкоженных тостов (на стороне Клиента) к структурированному Backend-driven дизайну.

### Единая модель (Universal Notification Object)

Вместо того, чтобы собирать тексты из кусочков на клиенте:

```typescript
interface UnifiedNotification {
  id: string // UUID from DB
  category: 'system' | 'business' | 'chat'
  level: 'info' | 'success' | 'warning' | 'error'

  // Тело сообщения (В идеале backend должен присылать ключи локализации, а не сырой текст)
  titleKey: string // e.g., "notifications.appointment.started.title"
  messageKey: string // e.g., "notifications.appointment.started.msg"
  messageData?: Record<string, string> // e.g., { "worker": "Ivan", "client": "OOO Ромашка" }

  // Экшен для кнопки
  actionType?: 'navigate' | 'open_modal' | 'refresh'
  actionPayload?: string // e.g., "/dienstplan" or "modal_id"

  createdAt: string // ISO DateTime
}
```

С такой унификацией SSE `pg_notify` будет напрямую генерировать готовый унифицированный JSON.
`SchedulingContext` просто передаст его в `addNotification`, а `NotificationObserver` сам переведет `titleKey` (через `useTranslation()`) и отобразит Toast с нужной кнопкой.
