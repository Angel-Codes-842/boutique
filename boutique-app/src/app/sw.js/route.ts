const cleanupWorker = `
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
    await self.registration.unregister();
  })());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
`;

export async function GET() {
  return new Response(cleanupWorker, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
      "Service-Worker-Allowed": "/",
    },
  });
}
