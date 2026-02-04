/**
 * Генерация ID в стиле Firebase (21 символ alphanumeric)
 * Криптографически безопасная альтернатива UUID
 */
export const generateId = (): string => {
  const array = new Uint8Array(21)
  crypto.getRandomValues(array) // использует системный CSPRNG
  return Array.from(
    array,
    b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]
  ).join('')
}
