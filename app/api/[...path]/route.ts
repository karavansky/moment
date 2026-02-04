import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxyRequest(request, path)
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/')
  const url = new URL(request.url)
  const queryString = url.search
  const targetUrl = `${API_URL}/${path}${queryString}`

  console.log(`[API Proxy] ${request.method} ${path} -> ${targetUrl}`)

  try {
    // Forward headers
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      // Skip host header to avoid conflicts
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value)
      }
    })

    // Get request body if present
    let body: BodyInit | undefined = undefined
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type') || ''
      try {
        // For multipart/form-data (file uploads), pass the body as a stream
        // to avoid corrupting binary data
        if (contentType.includes('multipart/form-data')) {
          body = request.body ?? undefined
        } else {
          body = await request.text()
        }
      } catch (e) {
        // No body
      }
    }

    // Make request to backend
    const fetchOptions: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
      body,
    }
    // Required for streaming body in Node.js fetch
    if (body instanceof ReadableStream) {
      fetchOptions.duplex = 'half'
    }
    const response = await fetch(targetUrl, fetchOptions)

    // Forward response headers
    const responseHeaders = new Headers(response.headers)

    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', '*')

    // Get response body
    const responseBody = await response.text()

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error(`[API Proxy] Error:`, error)
    return NextResponse.json(
      { error: 'Proxy error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}
