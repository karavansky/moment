/**
 * Simple AES-GCM encryption for telemetry data to protect business logic
 * This prevents competitors from seeing what metrics we collect in DevTools Network tab
 */

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12 // 96 bits recommended for AES-GCM

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt telemetry payload
 */
export async function encryptTelemetry(payload: any): Promise<string> {
  try {
    const secret = process.env.NEXT_PUBLIC_TELEMETRY_KEY
    if (!secret) {
      console.warn('[Telemetry] Encryption key not found, sending unencrypted')
      return JSON.stringify(payload)
    }

    // Generate random IV and salt
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const salt = crypto.getRandomValues(new Uint8Array(16))

    // Derive key from secret
    const key = await deriveKey(secret, salt)

    // Encrypt data
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(payload))
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      data
    )

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt, 0)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    // Return as base64
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('[Telemetry] Encryption failed:', error)
    // Fallback to unencrypted
    return JSON.stringify(payload)
  }
}

/**
 * Decrypt telemetry payload (server-side)
 */
export async function decryptTelemetry(encrypted: string, secret: string): Promise<any> {
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(encrypted)
        .split('')
        .map(c => c.charCodeAt(0))
    )

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 16 + IV_LENGTH)
    const data = combined.slice(16 + IV_LENGTH)

    // Derive key
    const key = await deriveKey(secret, salt)

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv.buffer as ArrayBuffer,
      },
      key,
      data
    )

    // Decode and parse JSON
    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(decrypted))
  } catch (error) {
    console.error('[Telemetry] Decryption failed:', error)
    throw new Error('Failed to decrypt telemetry data')
  }
}
