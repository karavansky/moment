import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { saveSubscription } from '@/lib/push-notifications'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { subscription } = await request.json()
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    await saveSubscription(session.user.id, subscription)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[push/subscribe] Error:', error)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}
