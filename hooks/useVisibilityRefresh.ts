import { useEffect, useState, useRef } from 'react'

/**
 * Хук для отслеживания возврата PWA из фонового (спящего) режима.
 *
 * Решает две задачи:
 * 1. Автоматически обновляет внутренний стейт "сегодняшнего дня", если
 *    во время сна наступили новые сутки (мягкая перерисовка календаря).
 * 2. Вызывает переданный callback (например, для запуска fetch-запросов)
 *    каждый раз, когда приложение возвращается в видимую зону экрана,
 *    что исправляет проблему потерянных Server-Sent Events во время фонового сна.
 *
 * @param onForegroundRefresh Опциональный callback, который нужно выполнить при каждом просыпании приложения.
 * @returns {Date} Актуальная дата (today)
 */
export function useVisibilityRefresh(onForegroundRefresh?: () => void) {
  const [today, setToday] = useState(() => new Date())
  const callbackRef = useRef(onForegroundRefresh)

  // Обновляем реф каждый рендер, чтобы useEffect всегда вызывал актуальную версию
  // callback без необходимости добавлять её в зависимости (и провоцировать лишние effect runs).
  useEffect(() => {
    callbackRef.current = onForegroundRefresh
  }, [onForegroundRefresh])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDate = new Date()

        // 1. Проверяем, не наступил ли новый день за время "сна"
        if (currentDate.toDateString() !== today.toDateString()) {
          setToday(currentDate)
        }

        // 2. Выполняем фоновое обновление данных для восстановления актуального стейта (Double-Check 패턴)
        if (callbackRef.current) {
          callbackRef.current()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Также можно добавить обработчик 'focus' окна для десктопных браузеров как fallback
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [today])

  return today
}
