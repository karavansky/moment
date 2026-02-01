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

  try {
    // 3. Fetch from SeaweedFS
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        // Forward necessary headers if needed, or minimal set
      },
    })

    if (!response.ok && response.status !== 304) {
       // Allow 404 from seaweed to be shown (e.g. empty folder or file not found)
       if (response.status === 404) {
           // Proceed to handle 404 content if it's HTML, otherwise return 404
       } else {
           return new NextResponse(response.statusText, { status: response.status })
       }
    }

    const contentType = response.headers.get('content-type') || ''
    
    // 4. Handle HTML (Rewrite Links)
    if (contentType.includes('text/html')) {
      let text = await response.text()

      // Simple regex replacement for href="/..." and src="/..."
      // We want to replace absolute paths starting with / with /api/seaweed-proxy/
      
      // Replace href="/..." but not href="//..." (protocol relative)
      text = text.replace(/href="\/([^”]*)"/g, `href="${PROXY_BASE_PATH}/$1"`)
      // Replace src="/..."
      text = text.replace(/src="\/([^”]*)"/g, `src="${PROXY_BASE_PATH}/$1"`)
      // Replace action="/..." (forms)
      text = text.replace(/action="\/([^”]*)"/g, `action="${PROXY_BASE_PATH}/$1"`)
      
      // Specifically fix the JS redirects or API calls if they use string concatenation
      // The SeaweedFS script uses `window.location.pathname` which is good.
      // But `handleDelete` etc use paths from the table which are absolute.
      
      // Fix: The table links like <a href="/buckets/"> are handled by href replacement.
      // The onclick handlers: onclick="handleDelete('\/buckets\/')"
      // These are JS strings. We might need to replace them too?
      // "handleDelete('\/buckets\/')" -> the path passed is "/buckets/".
      // Inside handleDelete: xhr.open('DELETE', url, false);
      // If url is "/buckets/", it becomes relative to current page?
      // No, starts with / means root.
      // So XHR DELETE "/buckets/" goes to domain root.
      // We need to replace these string literals too.
      
      // Replace escaped slashes in JS strings if they start with /
      // Look for '\/...' inside onclick? Hard to parse with regex safely.
      // But let's try a global replace of '\/' with '${PROXY_BASE_PATH}/' is dangerous.
      
      // Let's replace specifically `handleDelete('\/'` -> `handleDelete('${PROXY_BASE_PATH}/`
      // and `handleRename('...','\/')`
      
      // Better strategy: Inject a script at the top that overrides XMLHttpRequest or wraps the functions?
      // No, too complex.
      
      // Let's try to patch the specific functions in the script tag, or just replace the common patterns.
      // The SeaweedFS HTML is small and predictable (we saw it).
      
      // Replace '/ with '${PROXY_BASE_PATH}/' in specific contexts if possible.
      // Or just replace all `'/` with `'${PROXY_BASE_PATH}/` ? 
      // Might break `'/'` (root).
      
      // Let's try replacing known JS patterns from the SeaweedFS source we saw.
      // `onclick="handleRename('etc', '\/')"` -> `... '\/api/seaweed-proxy\/'` ?
      
      // Actually, if we just replace `\/` with `${PROXY_BASE_PATH}/` globally it might break closing tags `<\/div>`.
      // The slash in JS strings is often escaped `\/`.
      
      // Let's stick to HTML attributes first.
      // And for JS:
      // The script functions use `window.location.origin + window.location.pathname` for `handleCreateDir`. This is fine.
      // `handleRename`: `var url = basePath + encodeURIComponent(newName);`
      // `basePath` comes from arguments.
      // usage: `handleRename('etc', '\/')`. basePath is `\/`.
      // If we change the argument in HTML to `\/api/seaweed-proxy\/`, it works.
      
      // So we need to replace `\/` inside onclick attributes if it represents root.
      
      // Let's rely on a broader replacement for the specific JS calls seen in SeaweedFS.
      text = text.replace(/handleDelete\('\\[\/]/g, `handleDelete('\\${PROXY_BASE_PATH}/')`)
      text = text.replace(/handleRename\('([^']+)', '\\[\/]/g, `handleRename('$1', '\\${PROXY_BASE_PATH}/')`)
      
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
