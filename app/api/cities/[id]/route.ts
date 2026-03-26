import { NextRequest } from 'next/server'

// Proxy to Vapor API
// In production, nginx routes /api/cities to Vapor directly
// In dev mode, we proxy through Next.js
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const vaporUrl = process.env.VAPOR_API_URL || 'http://localhost:8080'

  const headers = new Headers()
  // Forward authentication cookie
  const cookie = req.headers.get('cookie')
  if (cookie) {
    headers.set('cookie', cookie)
  }

  const response = await fetch(`${vaporUrl}/api/cities/${id}`, {
    method: 'DELETE',
    headers,
  })

  if (response.status === 204) {
    return new Response(null, { status: 204 })
  }

  const data = await response.json()
  return Response.json(data, { status: response.status })
}
