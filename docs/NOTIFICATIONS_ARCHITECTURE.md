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

### Места, генерирующие системные Toasts (через `addNotification` в React UI):

_Работают только когда приложение открыто в браузере_

1.  **Начало встречи (`appointment_updated` -> `event.isOpen === true && !existing.isOpen`):**
    - **Кому:** Отправляется локально текущему пользователю в браузере (директору, если он смотрит дашборд).
    - **Данные:** `workerNames started an appointment with clientName clientAddress`.
    - **Action:** Кнопка "See on map" (Ссылка `/map/{appointmentID}`).
2.  **Завершение встречи (`appointment_updated` -> `!event.isOpen && existing.isOpen`):**
    - **Кому:** Локально текущему пользователю в браузере.
    - **Данные:** `workerNames finished an appointment with clientName clientAddress`.
    - **Action:** Отсутствует (только Dismiss).

---

### Места, генерирующие системные Push-Уведомления (на телефон через backend):

_Работают всегда, даже если PWA закрыто (выполняются в `lib/appointments.ts`)_

1.  **Создание новой встречи (`appointment_created`):**
    - **Кому:** Только назначенным работникам (Workers).
    - **Текст:** `You have been assigned to an appointment with {clientName}`.
    - **URL:** `/dienstplan`.

2.  **Изменение времени/даты встречи (`appointment_updated` -> `timeChanged: true`):**
    - **Кому:** Только назначенным работникам (Workers).
    - **Текст:** `Your appointment with {clientName} has been rescheduled.`
    - **URL:** `/dienstplan`.

3.  **Начало встречи (`appointment_updated` -> Переход `isOpen: false -> true`):**
    - **Кому:** Всем директорам (Directors) данной фирмы.
    - **Текст:** `{workerNames} started an appointment with {clientName}.`
    - **URL:** `/map/{appointmentID}`.

4.  **Завершение встречи (`appointment_updated` -> Переход `isOpen: true -> false`):**
    - **Кому:** Всем директорам (Directors) данной фирмы.
    - **Текст:** `{workerNames} finished an appointment with {clientName}.`
    - **URL:** `/dienstplan`.

5.  **Добавление/удаление работника из встречи (`appointment_updated` -> Изменение `workerIds`):**
    - **Кому:** Конкретным работникам (кого добавили или убрали).
    - **Текст:** `You have been assigned/removed from an appointment...`
    - **URL:** `/dienstplan`.

6.  **Удаление встречи (`appointment_deleted`):**
    - **Кому:** Только назначенным работникам.
    - **Текст:** `Your appointment... has been cancelled.`
    - **URL:** `/dienstplan`.

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

---

## 6. Решение проблемы Ghost-токенов в PWA (Multi-Account Bug)

При тестировании Push-уведомлений на реальных устройствах (например, iPad) был обнаружен архитектурный баг, связанный с жизненным циклом Service Worker'ов и Web Push API (“Гонка токенов”).

### Описание проблемы:

Браузер (Safari/Chrome) хранит привязку `PushSubscription` к устройству бессрочно. Если Директор залогинился на iPad и разрешил Push-уведомления, браузер генерирует уникальный токен и отправляет его на Backend. В базе данных этот токен привязывается к `userID` Директора.
Если после этого приложением хочет воспользоваться Работник, происходила следующая ситуация:

1. Директор выходит из текущей сессии, а Работник заходит в свой аккаунт.
2. PWA загружается и хук `usePushNotifications` спрашивает браузер: _"Есть ли у нас активная подписка?"_
3. Браузер отвечает: _"Да, вот она!"_ (возвращая старый токен, выданный Директору, так как Service Worker привязан к браузеру, а не к сессии сайта).
4. Хук локально считает, что подписка активна (`isSubscribed = true`).
5. **Баг:** Изначально отправка нового токена на Backend падала (или пропускалась), так как совершалась в момент неполной загрузки `Next.js Session` (до аутентификации). Токен **оставался закреплен за старым владельцем (Директором)**. Уведомления Работника "уходили в пустоту", а уведомления Директора приходили на iPad, который уже находился в руках Работника.

### Архитектурное Решение (Auth-Aware Sync):

Для решения проблемы реализован механизм глубокой привязки к сессии (Next-Auth) и принудительного удаления фантомных токенов:

1. **Мгновенный Перехват (usePushNotifications):**
   Хук Web Push теперь всегда отслеживает статус авторизации `const { status: authStatus } = useSession()`. Если в браузере технически есть старый Web Push токен, хук **дожидается** состояния `authStatus === 'authenticated'` и тут же в фоновом режиме отправляет токен на `POST /api/push/subscribe`. За счет PostgreSQL `ON CONFLICT ("endpoint") DO UPDATE` Backend моментально перезаписывает владельца токена на нового залогиненного пользователя.
2. **Безупречный Выход (Sign Out Purge):**
   Процедура выхода из аккаунта (в `SignOutPage.tsx`) изменена. Перед уничтожением куки авторизации (Next-Auth) страница обращается к `navigator.serviceWorker` и получает текущий токен. Затем она отправляет его на `POST /api/push/unsubscribe`. Backend **полностью удаляет этот токен из базы данных**. Таким образом, если сотрудник оставил публичный iPad/Desktop после смены, устройство становится абсолютно "чистым" и не будет получать никаких чужих Push-уведомлений (Ghost notifications).
