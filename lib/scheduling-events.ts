import { Client } from 'pg'

type EventCallback = (payload: any) => void

// Singleton: одно dedicated PG-соединение для LISTEN (не из pool)
let pgClient: Client | null = null
let isConnecting = false
let reconnectTimeout: NodeJS.Timeout | null = null

// firmaID → Set<callback>
const subscriptions = new Map<string, Set<EventCallback>>()

// Stats
let totalEventsProcessed = 0
let reconnectCount = 0
const eventTimestamps: number[] = [] // rolling window for eventsPerMinute
const latencySamples: number[] = []  // rolling window for avgLatency (last 100)

// Event loop lag: measured via setImmediate — shows how backed up the event loop is
let eventLoopLagMs = 0
function measureEventLoopLag() {
  const start = Date.now()
  setImmediate(() => {
    eventLoopLagMs = Date.now() - start
    setTimeout(measureEventLoopLag, 1000)
  })
}
measureEventLoopLag()

export interface SseStats {
  pgConnected: boolean
  activeChannels: number
  totalSubscribers: number
  eventsPerMinute: number
  avgLatencyMs: number
  totalEventsProcessed: number
  reconnectCount: number
  eventLoopLagMs: number
}

export function getStats(): SseStats {
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  // Prune old timestamps
  while (eventTimestamps.length > 0 && eventTimestamps[0] < oneMinuteAgo) {
    eventTimestamps.shift()
  }
  let totalSubscribers = 0
  for (const cbs of subscriptions.values()) {
    totalSubscribers += cbs.size
  }
  const avgLatencyMs =
    latencySamples.length > 0
      ? Math.round(latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length)
      : 0
  return {
    pgConnected: pgClient !== null,
    activeChannels: subscriptions.size,
    totalSubscribers,
    eventsPerMinute: eventTimestamps.length,
    avgLatencyMs,
    totalEventsProcessed,
    reconnectCount,
    eventLoopLagMs,
  }
}

function getChannelName(firmaID: string): string {
  // PostgreSQL channel names: lowercase, no special chars
  return `scheduling_${firmaID.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
}

async function ensureConnection(): Promise<Client> {
  if (pgClient) return pgClient
  if (isConnecting) {
    // Wait for ongoing connection
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (pgClient) {
          clearInterval(check)
          resolve(pgClient)
        }
        if (!isConnecting && !pgClient) {
          clearInterval(check)
          reject(new Error('Connection failed'))
        }
      }, 100)
    })
  }

  isConnecting = true

  try {
    const client = new Client({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
    })

    client.on('error', (err) => {
      console.error('[scheduling-events] PG client error:', err.message)
      pgClient = null
      scheduleReconnect()
    })

    client.on('end', () => {
      console.log('[scheduling-events] PG client disconnected')
      pgClient = null
      scheduleReconnect()
    })

    client.on('notification', (msg) => {
      if (!msg.payload) return
      const start = Date.now()

      try {
        const payload = JSON.parse(msg.payload)
        const firmaID = payload.firmaID

        if (firmaID) {
          const callbacks = subscriptions.get(firmaID)
          if (callbacks) {
            for (const cb of callbacks) {
              try {
                cb(payload)
              } catch (err) {
                console.error('[scheduling-events] Callback error:', err)
              }
            }
          }
        }

        // Track stats
        totalEventsProcessed++
        eventTimestamps.push(Date.now())
        latencySamples.push(Date.now() - start)
        if (latencySamples.length > 100) latencySamples.shift()
      } catch (err) {
        console.error('[scheduling-events] Failed to parse notification:', err)
      }
    })

    await client.connect()
    pgClient = client
    isConnecting = false

    // Re-subscribe to all active channels
    for (const firmaID of subscriptions.keys()) {
      const channel = getChannelName(firmaID)
      await client.query(`LISTEN "${channel}"`)
      console.log(`[scheduling-events] Re-subscribed to ${channel}`)
    }

    console.log('[scheduling-events] PG LISTEN client connected')
    return client
  } catch (err) {
    isConnecting = false
    console.error('[scheduling-events] Failed to connect:', err)
    scheduleReconnect()
    throw err
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) return
  if (subscriptions.size === 0) return // No active subscriptions, don't reconnect

  reconnectCount++
  reconnectTimeout = setTimeout(async () => {
    reconnectTimeout = null
    try {
      await ensureConnection()
    } catch {
      // ensureConnection already schedules reconnect on failure
    }
  }, 5000)
}

/**
 * Subscribe to scheduling events for a firmaID.
 * Returns an unsubscribe function.
 */
export async function subscribe(firmaID: string, callback: EventCallback): Promise<() => void> {
  let callbacks = subscriptions.get(firmaID)
  const isNewChannel = !callbacks || callbacks.size === 0

  if (!callbacks) {
    callbacks = new Set()
    subscriptions.set(firmaID, callbacks)
  }
  callbacks.add(callback)

  // Start LISTEN for this channel if first subscriber
  if (isNewChannel) {
    try {
      const client = await ensureConnection()
      const channel = getChannelName(firmaID)
      await client.query(`LISTEN "${channel}"`)
      console.log(`[scheduling-events] LISTEN ${channel}`)
    } catch (err) {
      console.error(`[scheduling-events] Failed to LISTEN for ${firmaID}:`, err)
    }
  }

  // Return unsubscribe function
  return () => {
    const cbs = subscriptions.get(firmaID)
    if (cbs) {
      cbs.delete(callback)

      // UNLISTEN if no more subscribers for this channel
      if (cbs.size === 0) {
        subscriptions.delete(firmaID)
        if (pgClient) {
          const channel = getChannelName(firmaID)
          pgClient.query(`UNLISTEN "${channel}"`).catch((err) => {
            console.error(`[scheduling-events] Failed to UNLISTEN ${channel}:`, err)
          })
          console.log(`[scheduling-events] UNLISTEN ${channel}`)
        }
      }
    }
  }
}
