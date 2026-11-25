const SHELL_CACHE = "boutique-shell-v1";
const SHELL_URLS = [
  "/",
  "/login",
  "/manifest.webmanifest",
  "/icon-180.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon.svg",
  "/favicon.ico",
];

/**
 * Service worker de la PWA: guarda solo el app shell y assets estáticos.
 * Nunca cachea /api/* para no exponer ni reutilizar datos privados de sesión.
 * Sin conexión se sirve el shell; los datos de ventas/caja requieren red.
 */
const serviceWorker = `
const CACHE = ${JSON.stringify(SHELL_CACHE)};
const SHELL = ${JSON.stringify(SHELL_URLS)};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.indexOf("boutique-shell-") === 0 && key !== CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf("/api/") === 0 || url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match(request)) ||
          (await cache.match("/login")) ||
          (await cache.match("/")) ||
          new Response(
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión</title><body style="font-family:system-ui;background:#0f172a;color:#fff;display:grid;place-items:center;min-height:100dvh;margin:0;text-align:center;padding:2rem"><div><h1 style="font-size:1.25rem">Sin conexión</h1><p style="color:#cbd5e1">Conectate a internet para abrir Boutique POS.</p><button onclick="location.reload()" style="min-height:44px;padding:0 1.25rem;border:0;border-radius:.75rem;background:#fff;color:#0f172a;font-weight:600">Reintentar</button></div></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          )
        );
      })
    );
    return;
  }

  const isAsset =
    url.pathname.indexOf("/_next/static/") === 0 ||
    /\\.(png|svg|ico|webmanifest)$/.test(url.pathname);
  if (!isAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          );
        }
        return response;
      });
    })
  );
});
`;

export async function GET() {
  return new Response(serviceWorker, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache",
      "Service-Worker-Allowed": "/",
    },
  });
}
