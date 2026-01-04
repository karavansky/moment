/**
 * Генерирует случайный буквенно-цифровой ID заданной длины
 * @param length - длина генерируемого ID (по умолчанию 20)
 * @returns случайный буквенно-цифровой ID
 */
export function generateId(length: number = 20): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }

  return result
}
