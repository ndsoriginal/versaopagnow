/// <reference lib="webworker" />
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js')

workbox.setConfig({ debug: false })

const { precacheAndRoute } = workbox.precaching
const { registerRoute } = workbox.routing
const { NetworkFirst, CacheFirst, StaleWhileRevalidate } = workbox.strategies
const { ExpirationPlugin } = workbox.expiration

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  /^https:\/\/nxilunpuywulvjoojeel\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 }),
    ],
  })
)

registerRoute(
  /\.(?:js|css|html|svg|png)$/,
  new StaleWhileRevalidate({ cacheName: 'static-assets' })
)

self.addEventListener('push', (event) => {
  let data = { title: 'PixBett', body: '', type: 'new_lead', url: '/admin' }
  try {
    if (event.data) data = event.data.json()
  } catch {}

  const options = {
    body: data.body,
    icon: '/pwa-icon.svg',
    badge: '/pwa-icon.svg',
    vibrate: data.type === 'pix_paid' ? [200, 100, 200, 100, 400] : [200],
    data: { type: data.type, url: data.url || '/admin' },
    requireInteraction: true,
  }

  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window' })
    if (clientsList.length > 0) {
      for (const client of clientsList) {
        client.postMessage({ type: 'PUSH_NOTIFICATION', data })
      }
    }
    return self.registration.showNotification(data.title, options)
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/admin'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()))
