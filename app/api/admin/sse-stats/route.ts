import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/users'
import { getStats } from '@/lib/scheduling-events'
import pool from '@/lib/db'

async function checkAdmin() {
  const session = await auth()
  if (!session?.user?.email) {
    return { error: 'Unauthorized', status: 401 }
  }
  const user = await getUserByEmail(session.user.email)
  if (!user?.isAdmin) {
    return { error: 'Forbidden: Admin access required', status: 403 }
  }
  return null
}

export async function GET() {
  const authError = await checkAdmin()
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status })
  }

  const sse = getStats()
  const poolStats = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }

  const mem = process.memoryUsage()
  const processStats = {
    heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    rssMb: Math.round(mem.rss / 1024 / 1024),
    externalMb: Math.round(mem.external / 1024 / 1024),
    uptimeSeconds: Math.round(process.uptime()),
    eventLoopLagMs: sse.eventLoopLagMs,
  }

  return NextResponse.json({
    sse,
    pool: poolStats,
    process: processStats,
    timestamp: new Date().toISOString(),
  })
}
