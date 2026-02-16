import { getAnySchedulingSession } from '../auth-check'
import { subscribe } from '@/lib/scheduling-events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getAnySchedulingSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const firmaID = session.user.firmaID!
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      // Keepalive every 30s to prevent connection timeout
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 30000)

      // Subscribe to PostgreSQL LISTEN events for this firmaID
      let unsubscribe: (() => void) | null = null
      try {
        unsubscribe = await subscribe(firmaID, (payload) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
          } catch {
            // Stream closed
          }
        })
      } catch (err) {
        console.error('[SSE] Failed to subscribe:', err)
      }

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(keepalive)
        unsubscribe?.()
        try {
          controller.close()
        } catch {
          // Already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
