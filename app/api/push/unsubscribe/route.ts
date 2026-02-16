import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { removeSubscription } from '@/lib/push-notifications'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { endpoint } = await request.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    await removeSubscription(endpoint)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/unsubscribe] Error:', error)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
