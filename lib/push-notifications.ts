// @ts-expect-error -- web-push has no type declarations
import webpush from 'web-push'
import pool from './db'

// Configure VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@moment-lbs.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushSubscriptionRecord {
  id: number
  userID: string
  endpoint: string
  p256dh: string
  auth: string
}

interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
}

// ---------- Subscription CRUD ----------

export async function saveSubscription(
  userID: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions ("userID", "endpoint", "p256dh", "auth")
     VALUES ($1, $2, $3, $4)
     ON CONFLICT ("endpoint") DO UPDATE SET
       "userID" = $1, "p256dh" = $3, "auth" = $4, "lastUsedAt" = NOW()`,
    [userID, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  )
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await pool.query(
    `DELETE FROM push_subscriptions WHERE "endpoint" = $1`,
    [endpoint]
  )
}

// ---------- Sending ----------

async function getSubscriptionsByUserID(userID: string): Promise<PushSubscriptionRecord[]> {
  const result = await pool.query(
    `SELECT * FROM push_subscriptions WHERE "userID" = $1`,
    [userID]
  )
  return result.rows
}

export async function sendPushToUser(userID: string, payload: PushPayload): Promise<void> {
  const subs = await getSubscriptionsByUserID(userID)
  if (subs.length === 0) return

  // Check user preference
  const userResult = await pool.query(
    `SELECT "pushNotificationsEnabled" FROM users WHERE "userID" = $1`,
    [userID]
  )
  if (userResult.rows[0]?.pushNotificationsEnabled === false) return

  const jsonPayload = JSON.stringify(payload)

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        jsonPayload
      ).then(() => {
        // Update lastUsedAt on success
        pool.query(
          `UPDATE push_subscriptions SET "lastUsedAt" = NOW() WHERE "id" = $1`,
          [sub.id]
        ).catch(() => {})
      })
    )
  )

  // Clean up expired/invalid subscriptions (410 Gone or 404)
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'rejected') {
      const statusCode = (result.reason as any)?.statusCode
      if (statusCode === 410 || statusCode === 404) {
        await removeSubscription(subs[i].endpoint).catch(() => {})
        console.log(`[push] Removed expired subscription for user ${userID}`)
      } else {
        console.error(`[push] Failed to send to user ${userID}:`, result.reason)
      }
    }
  }
}

// ---------- High-Level Notification Functions ----------

/**
 * Resolve workerIDs → userIDs via workers table, then send push to each.
 */
export async function sendPushToWorkers(workerIds: string[], payload: PushPayload): Promise<void> {
  if (workerIds.length === 0) return

  const placeholders = workerIds.map((_, i) => `$${i + 1}`).join(', ')
  const result = await pool.query(
    `SELECT "userID" FROM workers WHERE "workerID" IN (${placeholders}) AND "userID" IS NOT NULL`,
    workerIds
  )

  const userIds = result.rows.map((r: any) => r.userID as string)
  await Promise.allSettled(
    userIds.map(uid => sendPushToUser(uid, payload))
  )
}

/**
 * Send push to all directors/managers (status 0 or 3) of a firma.
 */
export async function sendPushToDirectors(firmaID: string, payload: PushPayload): Promise<void> {
  const result = await pool.query(
    `SELECT "userID" FROM users WHERE "firmaID" = $1 AND ("status" IN (0, 3) OR "status" IS NULL)`,
    [firmaID]
  )

  await Promise.allSettled(
    result.rows.map((r: any) => sendPushToUser(r.userID, payload))
  )
}
