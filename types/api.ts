// API Types matching Vapor backend
export interface RegisterRequest {
  username: string
  password: string
  host?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  username: string
  expiresAt?: number // Unix timestamp when session expires
}

// LEGACY: Full keys (for backward compatibility)
export interface WSMessage {
  type:
    | 'system'
    | 'message'
    | 'join'
    | 'leave'
    | 'user_status'
    | 'cpu_status'
    | 'subscribe_response'
    | 'unsubscribe_response'
    | 'subscribed'
    | 'unsubscribed'
    | 'ping'
    | 'pong'
    | 'latency_pong'
  content: string
  username?: string
  timestamp: number
  messageType?: string // For subscription responses
}

// OPTIMIZED: Short keys version (75% traffic reduction)
// Mapping: type->t, content->c, username->u, timestamp->d
export interface WSMessageShort {
  t:
    | 'system'
    | 'message'
    | 'join'
    | 'leave'
    | 'user_status'
    | 'cpu_status'
    | 'cpu'
    | 'subscribe_response'
    | 'unsubscribe_response'
    | 'subscribed'
    | 'unsubscribed'
    | 'ping'
    | 'pong'
    | 'latency_pong'
  c: string
  u?: string
  d: number
}

export interface ChatMessage {
  id: string
  type: 'system' | 'message' | 'join' | 'leave'
  content: string
  username?: string
  timestamp: Date
  isOwn?: boolean
}

export interface User {
  username: string
  status: number // CPU load percentage
  isOnline: boolean
  lastActivity?: string // ISO timestamp
  host?: string // Host URL
  activeSessions: number // Active sessions count from Redis
}

export interface UpdatePasswordRequest {
  username: string
  newPassword: string
}

export interface UpdateHostRequest {
  username: string
  host?: string
}
