# PWA — Boutique POS

La app es instalable en Android/Chrome y iOS/Safari (menú → “Agregar a pantalla de inicio”).

## Alcance de offline (v1)

- Se cachea solo el **app shell**: `/`, `/login`, manifiesto, íconos y assets estáticos (`/_next/static/*`).
- Con internet, las navegaciones usan la red; si falla, se sirve el shell cacheado o una pantalla mínima de “Sin conexión”.
- **No se cachean** rutas `/api/*`: ventas, caja, créditos, clientes y sesión requieren red. Esto evita mostrar datos privados desactualizados.
- Un aviso discreto aparece cuando el dispositivo pierde conexión.

## Archivos

- `src/app/manifest.webmanifest/route.ts`: manifiesto con `id`, `scope`, shortcuts e íconos PNG/SVG.
- `src/app/sw.js/route.ts`: service worker con caché versionada `boutique-shell-v1`. Si cambiás el shell, subí la versión del nombre de caché.
- `src/components/pwa-register.tsx`: registro del SW solo en producción (en `next dev` se omite para no romper HMR).
- `src/components/offline-banner.tsx`: aviso de conexión.
- `public/icon-180.png`, `icon-192.png`, `icon-512.png`: íconos raster reales; `icon.svg` es el fallback vectorial.

## Verificación rápida

```bash
curl -I http://localhost:3000/manifest.webmanifest
curl -I http://localhost:3000/sw.js
curl -I http://localhost:3000/icon-192.png
```

En DevTools → Application: revisionar Manifest y Service Worker, luego activar “Offline” y recargar. El menú debe abrir; una operación de caja/ventas debe fallar con mensaje de red.
