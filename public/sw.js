const CACHE_NAME = "dinova-v1";
const CORE_ASSETS = ["/", "/manifest.webmanifest", "/site.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((r) => r || caches.match("/")))
  );
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let title = "Dinova";
      let body = "You have a new notification.";
      let url = "/";
      let tag = `ff-${Date.now()}`;
      let level = "info";

      if (event.data) {
        try {
          const raw = await event.data.text();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.title) title = parsed.title;
            if (parsed.body != null && parsed.body !== "") body = String(parsed.body);
            if (parsed.url) url = parsed.url;
            if (parsed.level) level = String(parsed.level);
            if (parsed.id) tag = String(parsed.id);
            else if (parsed.tag) tag = `${parsed.tag}-${parsed.ts ?? Date.now()}`;
          }
        } catch (_) {
          /* ignore malformed payload */
        }
      }

      try {
        const clientList = await clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        for (const client of clientList) {
          client.postMessage({ type: "dinova-push-received", level });
        }
      } catch (_) {}

      await self.registration.showNotification(title, {
        body,
        icon: "/android-chrome-192x192.png",
        badge: "/android-chrome-192x192.png",
        tag,
        renotify: true,
        silent: false,
        vibrate: [180, 120, 180],
        requireInteraction: false,
        data: { url },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || "/";
  const targetUrl = new URL(raw, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client && typeof client.navigate === "function") {
            try {
              client.navigate(targetUrl);
            } catch (_) {}
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
