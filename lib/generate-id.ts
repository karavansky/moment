/**
 * Генерация ID в стиле Firebase (алфавитно-цифровой)
 * Криптографически безопасная альтернатива UUID
 * @param length Длина возвращаемой строки, по умолчанию 21
 */
export const generateId = (length: number = 21): string => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array) // использует системный CSPRNG
  return Array.from(
    array,
    b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]
  ).join('')
}
