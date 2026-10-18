const CACHE_NAME = "rkmomo-static-v2";
const RUNTIME_CACHE = "rkmomo-runtime-v2";

const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-icon.png",
  "/favicon.ico",
];

// Precache critical app shell on install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("PWA precache error:", err);
      });
    })
  );
  self.skipWaiting();
});

// Clean up previous version caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch (error) {
        console.error("Invalid push notification payload:", error);
      }

      const data = payload && typeof payload === "object" ? payload : {};
      const title = typeof data.title === "string" ? data.title : "RK MOMO";
      const options = {
        body: typeof data.body === "string" ? data.body : "A new order has been received.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: typeof data.tag === "string" ? data.tag : "rkmomo-new-order",
        data: { url: typeof data.url === "string" ? data.url : "/dashboard" },
        requireInteraction: true,
      };

      const dashboardClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const dashboardIsVisible = dashboardClients.some((client) => {
        try {
          return new URL(client.url).pathname.startsWith("/dashboard") && client.visibilityState === "visible";
        } catch (error) {
          console.warn("Could not inspect notification client URL:", error);
          return false;
        }
      });

      if (!dashboardIsVisible) {
        await self.registration.showNotification(title, options);
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data && typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/dashboard",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const dashboardClient = clients.find((client) => {
        try {
          return new URL(client.url).pathname.startsWith("/dashboard");
        } catch (error) {
          console.warn("Could not inspect notification client URL:", error);
          return false;
        }
      });

      if (dashboardClient) {
        await dashboardClient.navigate(targetUrl);
        return dashboardClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});

// Intelligent fetch caching strategy for high-performance PWA
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept non-GET or API endpoints
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) {
    return;
  }

  // 2. Next.js immutable static assets (_next/static/) and local static media: Cache-First
  // Since Next.js static files contain content hashes, they never change and are 100% safe to cache
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|woff|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === "error") {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. External images (Unsplash, etc.): Stale-While-Revalidate for instant render
  if (url.hostname.includes("images.unsplash.com") || url.hostname.includes("unsplash.com")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, resClone));
            }
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. HTML Navigation (Pages): Fast Network with 1.5s timeout falling back to Cache
  if (request.mode === "navigate") {
    event.respondWith(
      new Promise((resolve) => {
        let didTimeout = false;
        const timer = setTimeout(() => {
          didTimeout = true;
          caches.match(request).then((cached) => {
            if (cached) resolve(cached);
          });
        }, 1500);

        fetch(request)
          .then((networkResponse) => {
            clearTimeout(timer);
            if (networkResponse && networkResponse.status === 200) {
              const resClone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, resClone));
            }
            resolve(networkResponse);
          })
          .catch(async () => {
            clearTimeout(timer);
            const cached = await caches.match(request);
            if (cached) return resolve(cached);
            const rootCached = await caches.match("/");
            if (rootCached) return resolve(rootCached);
          });
      })
    );
    return;
  }

  // 5. Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
