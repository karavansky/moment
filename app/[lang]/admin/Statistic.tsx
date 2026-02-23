'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@heroui/react'

interface SseStats {
  pgConnected: boolean
  activeChannels: number
  totalSubscribers: number
  eventsPerMinute: number
  avgLatencyMs: number
  totalEventsProcessed: number
  reconnectCount: number
  eventLoopLagMs: number
}

interface PoolStats {
  total: number
  idle: number
  waiting: number
}

interface ProcessStats {
  heapUsedMb: number
  heapTotalMb: number
  rssMb: number
  externalMb: number
  uptimeSeconds: number
  eventLoopLagMs: number
}

interface StatsData {
  sse: SseStats
  pool: PoolStats
  process: ProcessStats
  timestamp: string
}

const REFRESH_INTERVAL = 10_000

function StatCard({
  label,
  value,
  sub,
  status,
}: {
  label: string
  value: string | number
  sub?: string
  status?: 'ok' | 'warn' | 'error'
}) {
  const dotColor =
    status === 'ok' ? 'bg-green-500' : status === 'warn' ? 'bg-yellow-500' : status === 'error' ? 'bg-red-500' : undefined

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-default-200 bg-default-50 px-5 py-4">
      <div className="flex items-center gap-2">
        {dotColor && <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />}
        <span className="text-xs text-default-400 uppercase tracking-wide">{label}</span>
      </div>
      <span className="text-2xl font-semibold text-default-900">{value}</span>
      {sub && <span className="text-xs text-default-400">{sub}</span>}
    </div>
  )
}

export default function Statistic() {
  const [data, setData] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sse-stats')
      if (!res.ok) {
        setError(`HTTP ${res.status}`)
        return
      }
      const json: StatsData = await res.json()
      setData(json)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError('Failed to fetch')
      console.error('[Statistic] fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    intervalRef.current = setInterval(fetchStats, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchStats])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-default-400 text-sm">
        Loading stats...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-danger text-sm">
        <span>{error ?? 'No data'}</span>
        <Button size="sm" variant="ghost" onPress={fetchStats}>
          Retry
        </Button>
      </div>
    )
  }

  const { sse, pool, process: proc } = data

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-default-500">
          SSE / PostgreSQL LISTEN · auto-refresh every {REFRESH_INTERVAL / 1000}s
        </h3>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-default-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button size="sm" variant="ghost" onPress={fetchStats}>
            Refresh
          </Button>
        </div>
      </div>

      {/* SSE / LISTEN */}
      <div>
        <p className="text-xs text-default-400 uppercase tracking-wide mb-3">SSE · LISTEN/NOTIFY</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            label="PG LISTEN"
            value={sse.pgConnected ? 'Connected' : 'Disconnected'}
            status={sse.pgConnected ? 'ok' : 'error'}
            sub="singleton client"
          />
          <StatCard
            label="Active channels"
            value={sse.activeChannels}
            sub="firms with open tabs"
          />
          <StatCard
            label="SSE subscribers"
            value={sse.totalSubscribers}
            sub="open browser tabs"
          />
          <StatCard
            label="Events / min"
            value={sse.eventsPerMinute}
            status={sse.eventsPerMinute > 500 ? 'warn' : 'ok'}
            sub="pg_notify rate"
          />
          <StatCard
            label="Avg latency"
            value={`${sse.avgLatencyMs} ms`}
            status={sse.avgLatencyMs > 100 ? 'warn' : 'ok'}
            sub="notify → SSE send"
          />
          <StatCard
            label="Total events"
            value={sse.totalEventsProcessed.toLocaleString()}
            sub="since server start"
          />
          <StatCard
            label="Reconnects"
            value={sse.reconnectCount}
            status={sse.reconnectCount > 0 ? 'warn' : 'ok'}
            sub="PG client restarts"
          />
        </div>
      </div>

      {/* Pool */}
      <div>
        <p className="text-xs text-default-400 uppercase tracking-wide mb-3">PostgreSQL pool (max 20)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Total connections"
            value={pool.total}
            sub="of 20 max"
            status={pool.total >= 18 ? 'warn' : 'ok'}
          />
          <StatCard
            label="Idle"
            value={pool.idle}
            sub="ready to use"
          />
          <StatCard
            label="Waiting"
            value={pool.waiting}
            status={pool.waiting > 0 ? 'warn' : 'ok'}
            sub="queued requests"
          />
        </div>
      </div>

      {/* Node.js process */}
      <div>
        <p className="text-xs text-default-400 uppercase tracking-wide mb-3">Node.js process</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            label="Heap used"
            value={`${proc.heapUsedMb} MB`}
            sub={`of ${proc.heapTotalMb} MB total`}
            status={proc.heapUsedMb / proc.heapTotalMb > 0.85 ? 'warn' : 'ok'}
          />
          <StatCard
            label="RSS"
            value={`${proc.rssMb} MB`}
            sub="resident set size"
            status={proc.rssMb > 512 ? 'warn' : 'ok'}
          />
          <StatCard
            label="External"
            value={`${proc.externalMb} MB`}
            sub="C++ objects (buffers)"
          />
          <StatCard
            label="Event loop lag"
            value={`${proc.eventLoopLagMs} ms`}
            sub="setImmediate delay"
            status={proc.eventLoopLagMs > 50 ? 'warn' : proc.eventLoopLagMs > 100 ? 'error' : 'ok'}
          />
          <StatCard
            label="Uptime"
            value={
              proc.uptimeSeconds < 3600
                ? `${Math.floor(proc.uptimeSeconds / 60)}m ${proc.uptimeSeconds % 60}s`
                : `${Math.floor(proc.uptimeSeconds / 3600)}h ${Math.floor((proc.uptimeSeconds % 3600) / 60)}m`
            }
            sub="since server start"
          />
        </div>
      </div>
    </div>
  )
}
