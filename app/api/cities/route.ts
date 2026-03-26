import { NextRequest } from 'next/server'

// Proxy to Vapor API
// In production, nginx routes /api/cities to Vapor directly
// In dev mode, we proxy through Next.js
export async function GET(req: NextRequest) {
  const vaporUrl = process.env.VAPOR_API_URL || 'http://localhost:8080'

  const headers = new Headers()
  // Forward authentication cookie
  const cookie = req.headers.get('cookie')
  if (cookie) {
    headers.set('cookie', cookie)
  }

  const response = await fetch(`${vaporUrl}/api/cities`, {
    method: 'GET',
    headers,
  })

  const data = await response.json()
  return Response.json(data, { status: response.status })
}

export async function POST(req: NextRequest) {
  const vaporUrl = process.env.VAPOR_API_URL || 'http://localhost:8080'

  const headers = new Headers()
  headers.set('content-type', 'application/json')
  // Forward authentication cookie
  const cookie = req.headers.get('cookie')
  if (cookie) {
    headers.set('cookie', cookie)
  }

  const body = await req.json()

  const response = await fetch(`${vaporUrl}/api/cities`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return Response.json(data, { status: response.status })
}
