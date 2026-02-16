// Service Worker for Push Notifications

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Moment', body: event.data.text() }
  }

  const title = data.title || 'Moment'
  const options = {
    body: data.body || '',
    icon: data.icon || '/web-app-manifest-192x192.png',
    badge: '/favicon-96x96.png',
    tag: data.tag || 'default',
    renotify: true,
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (url !== '/') client.navigate(url)
          return
        }
      }
      // Open new tab
      return self.clients.openWindow(url)
    })
  )
})
