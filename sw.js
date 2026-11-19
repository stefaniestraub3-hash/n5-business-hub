self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  // Network-first fetch handler so Android Chrome enables 1-tap PWA "Install App" prompt and always fetches latest updates
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request, { cache: "no-cache" }).catch(() => caches.match(event.request))
  );
});
