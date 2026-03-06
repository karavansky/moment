import { NextResponse } from 'next/server'
import { sendPushToWorkers, sendPushToDirectors } from '@/lib/push-notifications'

export const dynamic = 'force-dynamic'

/**
 * Internal API endpoint for sending push notifications
 * Only accessible from localhost (Vapor API)
 */
export async function POST(request: Request) {
  // Security: Only allow requests from Vapor API container
  // Use internal API key for authentication between services
  const internalApiKey = request.headers.get('x-internal-api-key')
  const expectedKey = process.env.INTERNAL_API_KEY || 'vapor-internal-2024'

  if (process.env.NODE_ENV === 'production') {
    if (internalApiKey !== expectedKey) {
      console.error('[internal/send-push] Unauthorized: Invalid or missing API key')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const body = await request.json()
    const { type, target, workerIds, firmaID, payload } = body

    if (type === 'workers') {
      await sendPushToWorkers(workerIds, payload)
    } else if (type === 'directors') {
      await sendPushToDirectors(firmaID, payload)
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[internal/send-push] Error:', error)
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 })
  }
}
