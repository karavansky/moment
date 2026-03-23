import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headers: Record<string, string> = {}

  // Collect all headers
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  return NextResponse.json({
    headers,
    host: request.headers.get('host'),
    forwardedHost: request.headers.get('x-forwarded-host'),
    forwardedProto: request.headers.get('x-forwarded-proto'),
    url: request.url,
  }, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    }
  })
}
