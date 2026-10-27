# AGENTS.md

## Estructura
- Monorepo simple: `docker-compose.yml` en raíz, app Next.js en `boutique-app/`.
- Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Prisma 6 + PostgreSQL 16 (Docker).
- Moneda: Guaraníes (PYG). Todos los montos se guardan como **enteros** (`Int`) en Prisma. Usar `formatGuarani()` de `src/lib/utils.ts`.

## Comandos clave
Desde `/mnt/d/proyectos/boutique` (raíz) con Docker:
```bash
docker compose up --build -d        # levantar app + db
docker compose down                # detener
docker compose logs -f app         # ver logs
docker compose exec app <cmd>      # ejecutar en contenedor
```

Dentro de `boutique-app/`:
```bash
npm run dev                        # dev server
npm run build                      # build
npm run lint                       # eslint
npm run prisma:generate           # generar cliente
npm run prisma:migrate            # migrar dev
npm run prisma:studio             # Prisma Studio
npm run prisma:seed               # seed
```

Migraciones/seed con Docker:
```bash
docker compose exec app npx prisma@6.19.0 migrate dev --name <nombre>
docker compose exec app npx prisma generate
docker compose exec app npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

## Prisma
- Schema: `boutique-app/prisma/schema.prisma`. Cliente generado en `@prisma/client`.
- `prisma/seed.ts` usa `ts-node` (CommonJS). Configuración en `package.json#prisma.seed`.
- En dev con Docker hay volúmenes para `node_modules` y `.next`; si faltan deps, instalar dentro del contenedor.

## Entorno
- `.env.example` → copiar a `boutique-app/.env`. `DATABASE_URL` apunta al servicio `db` en Docker: `postgresql://boutique:boutique@db:5432/boutique`.
- Credenciales seed: `admin@boutique.com` / `admin123`, `cajero@boutique.com` / `cajero123`.

## Rutas
App Router en `boutique-app/src/app/`: `/`, `/pos`, `/caja`, `/productos`, `/inventario`, `/clientes`, `/ventas`.

## Gotchas
- Next.js 16 + Turbopack: hay bloque `AGENTS.md` en `boutique-app/` con reglas específicas de esta versión.
- Dependencias instaladas dentro del contenedor pueden fallar si se instalan solo en Windows/WSL sin sync. Si hay `Module not found`, reinstalar en el contenedor (`docker compose exec app npm install <pkg>`).
- Usar Prisma 6.x (el proyecto usa `^6.19.0`). `npx prisma` reciente puede pedir reemplazos; usar `npx prisma@6.19.0` si hay conflictos.
- Montos SIEMPRE enteros en Guaraníes. No usar decimales.
- Código en español (UI, comentarios donde aplica).
