import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      provider?: string
      isAdmin?: boolean
      sessionId?: string
      firmaID?: string
      organisationName?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    provider?: string
    isAdmin?: boolean
    firmaID?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    provider?: string
    userId?: string
    isAdmin?: boolean
    sessionId?: string
    firmaID?: string
    organisationName?: string
  }
}
