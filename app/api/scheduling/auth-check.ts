import { auth } from '@/lib/auth'

/**
 * Только директор (status=0) или до миграции (null/undefined) с firmaID.
 * Для CRUD операций (create/update/delete).
 */
export async function getSchedulingSession() {
  const session = await auth()

  if (!session?.user?.firmaID) return null

  // status=0 (директор) или undefined/null (до миграции) — разрешаем
  const status = session.user.status
  if (status != null && status !== 0) return null

  return session
}

/**
 * Любой авторизованный пользователь с firmaID.
 * Для GET (чтение с фильтрацией по роли) и SSE events.
 */
export async function getAnySchedulingSession() {
  const session = await auth()
  if (!session?.user?.firmaID) return null
  return session
}
