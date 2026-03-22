# Sport Booking System - Implementation Checklist

**Related:** [SPORT_BOOKING_SYSTEM.md](./SPORT_BOOKING_SYSTEM.md)

## ✅ Completed

- [x] Создан пользователь Sport- und Bäderamt (status=7)
- [x] Создана организация Sport- und Bäderamt
- [x] Документация системы

## 🚧 Phase 1: База данных и API

### Database Schema
- [ ] Добавить `isConfirmed BOOLEAN DEFAULT false` в `appointments`
- [ ] Добавить `confirmedBy VARCHAR(21)` в `appointments`
- [ ] Добавить `confirmedAt TIMESTAMP` в `appointments`
- [ ] Создать миграцию для существующих записей
- [ ] Добавить индексы для новых полей

### API Endpoints
- [ ] Обновить `POST /api/scheduling/appointments` для status=7
  - [ ] Логика: если создает status=8 (Teilnehmer) → `isConfirmed=false`
  - [ ] Логика: если создает status=7 (Verwaltung) → `isConfirmed=true`
- [ ] Создать `PATCH /api/scheduling/appointments/:id/confirm`
  - [ ] Проверка прав доступа (только status=7)
  - [ ] Установка `confirmedBy`, `confirmedAt`
- [ ] Создать `PATCH /api/scheduling/appointments/:id/reject`
  - [ ] Проверка прав доступа (только status=7)
- [ ] Обновить `GET /api/scheduling/appointments`
  - [ ] Фильтр по `isConfirmed` для status=7
- [ ] Создать `GET /api/scheduling/reports/objects`
  - [ ] Группировка по объектам (clients)
  - [ ] Фильтрация по дате, объекту, участнику, цели
  - [ ] Подсчет статистики

### API Types
- [ ] Обновить `types/scheduling.ts` - добавить поля подтверждения
- [ ] Создать `types/sport-booking.ts` - специфичные типы

## 🎨 Phase 2: UI и переводы

### Translations
- [ ] Создать `dictionaries/status7-de.json`
- [ ] Добавить все переводы из документации
- [ ] Интегрировать в систему i18n
- [ ] Создать хук `useStatus7Translation()`

### Conditional Rendering
- [ ] `DienstplanView.tsx` - условные названия для status=7
- [ ] `AppModal.tsx` - условные label'ы
- [ ] `AppView.tsx` - условные названия полей
- [ ] `ClientSelect.tsx` → `ObjectSelect.tsx` для status=7
- [ ] `StaffSelect.tsx` → `TeilnehmerSelect.tsx` для status=7
- [ ] `ServiceSelect.tsx` → `ZielSelect.tsx` для status=7

### New Components
- [ ] `components/sport/BookingCard.tsx`
  - [ ] Кнопки подтверждения/отклонения
  - [ ] Статус бронирования (pending/confirmed)
  - [ ] Информация о подтвердившем
- [ ] `components/sport/ConfirmationDialog.tsx`
  - [ ] Диалог подтверждения
  - [ ] Диалог отклонения с причиной
- [ ] `components/sport/BookingStatusChip.tsx`
  - [ ] ⏳ Ausstehend (pending)
  - [ ] ✅ Bestätigt (confirmed)
  - [ ] ❌ Abgelehnt (rejected)

### Navigation
- [ ] Обновить sidebar для status=7
  - [ ] Buchungen вместо Dienstplan
  - [ ] Objekte вместо Kunden
  - [ ] Teilnehmer вместо Mitarbeiter
  - [ ] Ziele вместо Dienstleistungen
  - [ ] Добавить раздел Berichte (Reports)

## 📊 Phase 3: Отчеты

### Reports Page
- [ ] Создать `app/[lang]/reports/page.tsx`
  - [ ] Доступ только для status=7
  - [ ] Redirect для других пользователей
- [ ] Создать `components/reports/ObjectsReport.tsx`
  - [ ] Таблица с группировкой по объектам
  - [ ] Колонки: Objekt, Datum, Teilnehmer, Ziel, Zeit, Status
- [ ] Создать `components/reports/ReportFilters.tsx`
  - [ ] Фильтр по периоду (от/до)
  - [ ] Фильтр по объекту
  - [ ] Фильтр по участнику
  - [ ] Фильтр по цели
  - [ ] Фильтр по статусу

### Export Functionality
- [ ] Экспорт в PDF
  - [ ] Библиотека (jsPDF или react-pdf)
  - [ ] Шаблон PDF с логотипом
  - [ ] Форматирование таблицы
- [ ] Экспорт в Excel/CSV
  - [ ] Библиотека (xlsx или csv-export)
  - [ ] Форматирование заголовков
- [ ] Кнопка "Email отчет"
  - [ ] Модальное окно выбора получателя
  - [ ] Отправка через API

### Statistics & Charts
- [ ] Статистика использования объектов
  - [ ] Общее количество бронирований
  - [ ] Часы использования
  - [ ] Топ участников
- [ ] Графики (optional)
  - [ ] График загрузки по дням
  - [ ] Диаграмма распределения по целям

## 🧪 Phase 4: Тестирование

### Test Data
- [ ] Создать 5-10 тестовых объектов (Stadion, Schwimmbad, etc.)
- [ ] Создать 3-5 тестовых участников (FC Bonn, etc.)
- [ ] Создать услуги (Fußball, Schwimmen, etc.)
- [ ] Создать тестовые бронирования

### Manual Testing
- [ ] Вход как Verwaltung (status=7)
  - [ ] Проверить кастомные названия
  - [ ] Создать бронирование
  - [ ] Просмотреть все бронирования
- [ ] Вход как Teilnehmer (status=1)
  - [ ] Создать заявку на бронирование
  - [ ] Проверить, что `isConfirmed=false`
  - [ ] Проверить, что видны только свои бронирования
- [ ] Workflow подтверждения
  - [ ] Verwaltung видит неподтвержденные
  - [ ] Verwaltung может подтвердить
  - [ ] Teilnehmer получает уведомление
- [ ] Отчеты
  - [ ] Фильтрация работает
  - [ ] Экспорт в PDF работает
  - [ ] Экспорт в Excel работает

### Edge Cases
- [ ] Попытка Teilnehmer создать бронирование на занятое время
- [ ] Попытка Teilnehmer редактировать подтвержденное бронирование
- [ ] Попытка обычного пользователя (status≠7) доступ к отчетам
- [ ] Изменение status пользователя с 7 на другой

## 🔒 Security & Permissions

- [ ] Проверка прав доступа в API routes
  - [ ] Только status=7 может подтверждать
  - [ ] Только status=7 видит все бронирования
  - [ ] Teilnehmer видит только свои
- [ ] Валидация данных
  - [ ] Дата не в прошлом
  - [ ] Время начала < времени окончания
  - [ ] Объект существует и активен
- [ ] Rate limiting для создания бронирований

## 📚 Documentation

- [x] Основной документ `SPORT_BOOKING_SYSTEM.md`
- [x] Checklist `SPORT_BOOKING_CHECKLIST.md`
- [ ] API документация
- [ ] Руководство пользователя для Verwaltung
- [ ] Руководство пользователя для Teilnehmer
- [ ] Changelog

## 🚀 Deployment

- [ ] Создать migration SQL скрипт
- [ ] Протестировать на dev сервере
- [ ] Backup базы данных
- [ ] Deploy на production
- [ ] Мониторинг ошибок первые 24 часа

---

## 📊 Progress Tracking

**Overall Progress:** 3/150 tasks (2%)

- Phase 1 (DB & API): 0/15 (0%)
- Phase 2 (UI): 0/17 (0%)
- Phase 3 (Reports): 0/12 (0%)
- Phase 4 (Testing): 0/13 (0%)
- Security: 0/6 (0%)
- Documentation: 2/6 (33%)
- Deployment: 0/5 (0%)

---

**Last Updated:** 2025-03-22
**Next Milestone:** Phase 1 - Database Schema Changes
