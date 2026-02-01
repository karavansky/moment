import { auth } from '@/lib/auth'
import { getUserByEmail } from '@/lib/users'
import { NextRequest, NextResponse } from 'next/server'

// Prevent automatic static optimization
export const dynamic = 'force-dynamic'

const SEAWEED_FILER_URL = 'http://127.0.0.1:8888'
const PROXY_BASE_PATH = '/api/seaweed-proxy'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  // 1. Auth Check
  const session = await auth()
  if (!session?.user?.email) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const user = await getUserByEmail(session.user.email)
  if (!user?.isAdmin) {
    return new NextResponse('Forbidden', { status: 403 })
  }

      // 2. Construct Target URL
      const { path } = await params
      const pathStr = path ? path.join('/') : ''
      const searchParams = req.nextUrl.searchParams.toString()
      const targetUrl = `${SEAWEED_FILER_URL}/${pathStr}${searchParams ? `?${searchParams}` : ''}`
  
      console.log('[SeaweedProxy] Request:', { path: pathStr, targetUrl, method: req.method })
  
      try {
        // 3. Fetch from SeaweedFS
        // Clone headers but remove cache validation to ensure we get body to rewrite
        const headers = new Headers(req.headers)
        headers.delete('if-none-match')
        headers.delete('if-modified-since')
        headers.delete('connection')
        headers.delete('host') // Let fetch set the host

        const response = await fetch(targetUrl, {
          method: req.method,
          headers: headers,
          cache: 'no-store', // Force network request
        })
        
        console.log('[SeaweedProxy] Response status:', response.status)
  
        if (!response.ok && response.status !== 304) {
           // Allow 404 from seaweed to be shown (e.g. empty folder or file not found)
           if (response.status === 404) {
               // Proceed to handle 404 content if it's HTML
           } else {
               return new NextResponse(response.statusText, { status: response.status })
           }
        }
    
        const contentType = response.headers.get('content-type') || ''
        
        // 4. Handle HTML (Rewrite Links)
        if (contentType.includes('text/html')) {
          let text = await response.text()
          const originalLen = text.length

          // Regex to match href/src/action with absolute paths starting with /
          // Supports single/double quotes and whitespace
          // Captures: 1=attribute name, 2=quote, 3=path content
          const regex = /(href|src|action)\s*=\s*(["'])\/([^"']*)\2/g
          
          let matchCount = 0
          text = text.replace(regex, (match, attr, quote, path) => {
            matchCount++
            return `${attr}=${quote}${PROXY_BASE_PATH}/${path}${quote}`
          })
          
          console.log(`[SeaweedProxy] Rewrote ${matchCount} links. HTML len: ${originalLen} -> ${text.length}`)

          // Handle JS strings for specific SeaweedFS functions
          text = text.replace(/handleDelete\s*\(\s*'\\\/([^']*)'/g, `handleDelete('\\${PROXY_BASE_PATH}/$1'`)
          text = text.replace(/handleRename\s*\(\s*'([^']*)'\s*,\s*'\\\/([^']*)'/g, `handleRename('$1', '\\${PROXY_BASE_PATH}/$2'`)
          
          return new NextResponse(text, {
            headers: {
              'Content-Type': 'text/html',
            },
          })
        }

    // 5. Handle Other Content (Stream)
    // For binary files, streams, etc.
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
        // Copy other useful headers?
        'Content-Length': response.headers.get('content-length') || '',
        'Cache-Control': response.headers.get('cache-control') || 'no-cache',
      },
    })

  } catch (error) {
    console.error('SeaweedFS Proxy Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Handle POST, DELETE, etc. similarly if needed
export async function POST(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return handleMethod(req, context)
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
    return handleMethod(req, context)
}

async function handleMethod(req: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    // Auth Check
    const session = await auth()
    if (!session?.user?.email) return new NextResponse('Unauthorized', { status: 401 })
    const user = await getUserByEmail(session.user.email)
    if (!user?.isAdmin) return new NextResponse('Forbidden', { status: 403 })

    const { path } = await params
    const pathStr = path ? path.join('/') : ''
    // Important: For Delete/Post, the client (our modified HTML) might send requests to /api/seaweed-proxy/buckets/foo
    // We need to strip /api/seaweed-proxy/ prefix if it was passed in the path?
    // No, Next.js params `path` will contain ['buckets', 'foo'].
    // So `pathStr` will be `buckets/foo`.
    // The Target URL construction is same as GET.

    const searchParams = req.nextUrl.searchParams.toString()
    const targetUrl = `${SEAWEED_FILER_URL}/${pathStr}${searchParams ? `?${searchParams}` : ''}`
    
    try {
        const body = req.body // Stream
        // Note: For POST with FormData, we need to pass headers properly (boundary).
        // fetch accepts body as stream usually.
        
        const headers = new Headers()
        // Pass Content-Type
        if (req.headers.has('content-type')) {
            headers.set('content-type', req.headers.get('content-type')!)
        }
        
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: body,
            // @ts-ignore
            duplex: 'half' // Required for Node.js fetch with body stream
        })
        
        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
        })
    } catch (error) {
        console.error('Proxy Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
