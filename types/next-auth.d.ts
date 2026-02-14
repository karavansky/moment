import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      provider?: string
      isAdmin?: boolean
      sessionId?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    provider?: string
    isAdmin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    provider?: string
    userId?: string
    isAdmin?: boolean
    sessionId?: string
  }
}
