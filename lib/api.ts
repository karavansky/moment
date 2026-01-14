// API client for Vapor backend
// Always use Next.js proxy (/api) on client-side unless NEXT_PUBLIC_API_URL is set
import type { User } from '@/types/api'

const API_BASE_URL = (() => {
  // Server-side: use proxy in dev, respect env var in production
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development'
      ? '/api'
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }

  // Client-side: always use proxy unless explicitly configured otherwise
  // This avoids CORS issues when accessing from any hostname
  return process.env.NEXT_PUBLIC_API_URL || 'ws/api'
})()

export class ApiClient {
  private static async fetchJSON<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    console.log(`API Request: ${endpoint}`, options)
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  static async register(username: string, password: string, host?: string) {
    return this.fetchJSON<{ sessionId: string; username: string; expiresAt?: number }>(
      '/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, password, host }),
      }
    )
  }

  static async login(username: string, password: string) {
    return this.fetchJSON<{ sessionId: string; username: string; expiresAt?: number }>('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  }

  static async logout(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }
  }

  static async getMessageHistory(token: string) {
    return this.fetchJSON<any[]>('/messages', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  static async getUsersList(token: string) {
    return this.fetchJSON<User[]>('/users', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  static async getUserMessages(token: string, username: string) {
    return this.fetchJSON<any[]>(`/user?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }

  static async getUserStatusHistory(token: string, username: string) {
    return this.fetchJSON<{ username: string; isOnline: boolean; timestamp: number }[]>(
      `/user/status-history?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  }

  static getWebSocketURL(sessionId: string): string {
    // WebSocket must connect directly to backend (Next.js can't proxy WS in App Router)
    const backendUrl = 'ws://ws.moment-lbs.app'
    /*  
    typeof window !== 'undefined'
        ? `ws://${window.location.hostname}:3003`
        : 'ws://localhost:3003'
        */
    //const encodedSessionId = encodeURIComponent(sessionId);
    const wsUrl = `${backendUrl}/chat?sessionId=${sessionId}`
    console.log('WebSocket URL:', wsUrl)
    return wsUrl
  }

  // User management methods
  static async deleteUser(token: string, username: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }
  }

  static async updatePassword(token: string, username: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, newPassword }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }
  }

  static async updateHost(token: string, username: string, host?: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/host`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username, host }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP ${response.status}`)
    }
  }
}
