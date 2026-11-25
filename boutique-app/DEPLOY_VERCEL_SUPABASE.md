# Deploy en Vercel + Supabase

Guía para publicar este monorepo en Vercel usando Supabase (PostgreSQL) como base de datos.

> ⚠️ Los valores reales de las connection strings y del `SESSION_SECRET` **no se versionan**. Cargalos en
> Vercel → *Project Settings → Environment Variables* (marcá las contraseñas como *Secret*).

## 1) Supabase

En **Project Settings → Database → Connection strings** vas a ver dos poolers con el mismo host
(`aws-1-<region>.pooler.supabase.com`):

| Uso | Puerto | Variable |
|---|---|---|
| Session pooler | `5432` | `DATABASE_URL` y `DIRECT_URL` |
| Transaction pooler | `6543` | ❌ no recomendado aquí |

**Usá el session pooler (5432) para todo.** La app usa transacciones interactivas de Prisma
(`$transaction(async tx => …)`) en ventas, caja, abonos e inventario; el transaction pooler (6543) puede
cortarlas. El session pooler además resuelve por IPv4, así que funciona tanto desde tu máquina
como desde Vercel.

```text
DATABASE_URL=postgresql://postgres.<REF>:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?connection_limit=1
DIRECT_URL=postgresql://postgres.<REF>:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres
```

El host directo `db.<REF>.supabase.co` suele resolver solo IPv6; no lo uses para el runtime.

`connection_limit=1` evita abrir demasiadas conexiones cuando Vercel escala a muchas instancias.

## 2) Aplicar migraciones (una vez, antes del primer deploy)

Vercel **no ejecuta** `prisma/migrate.mjs` (eso es del Dockerfile/Render). Corré esto desde tu máquina
con las mismas variables del paso 1:

```bash
cd boutique-app
npm ci --legacy-peer-deps
DATABASE_URL="<session-5432>" DIRECT_URL="<session-5432>" npx prisma@6.19.0 migrate deploy
```

Debe terminar con todas las migraciones aplicadas. Si la BD ya tenía un esquema creado a mano con
`prisma/supabase-init.sql`, hacé primero el baseline (ver `prisma/migrate.mjs`) para no duplicar tablas.

## 3) Importar el proyecto en Vercel

1. *Add New → Project* y elegí el repo.
2. **Root Directory: `boutique-app`** (imprescindible: el `package.json` está ahí, no en la raíz).
3. Framework: **Next.js**. Node.js: **22.x**.
4. No hace falta sobreescribir comandos: los toma de `boutique-app/vercel.json`:
   - Install: `npm ci --legacy-peer-deps`
   - Build: `prisma generate && next build`
5. *Deploy*. El build corre `prisma generate`, así que el client de Prisma queda incluido.

## 4) Variables de entorno en Vercel

Cargalas para **Production** (y *Preview* si querés probar con la misma BD):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | Session pooler 5432 + `?connection_limit=1` |
| `DIRECT_URL` | Session pooler 5432 (sin `connection_limit`) |
| `SESSION_SECRET` | Aleatorio de ≥32 caracteres, **fijo** entre deploys |
| `TZ` | `America/Asuncion` (para que los reportes corten el día en hora local) |
| `FACTPY_ENABLED` | `false` hasta tener credenciales reales |
| `FACTPY_API_URL` | `https://api.factpy.com` |
| `FACTPY_RECORD_ID` | Secreto del servidor, solo si FACTPY está activo |
| `FACTPY_ENVIRONMENT` | `test` primero, después `production` |
| `FACTPY_TIMEOUT_MS` | `10000` |

`NODE_ENV` lo define Vercel: no lo cargues a mano.

## 5) Seed (datos iniciales)

El seed **no corre automáticamente** en Vercel. Ejecutalo una sola vez desde local:

```bash
cd boutique-app
DATABASE_URL="<session-5432>" DIRECT_URL="<session-5432>" npm run prisma:seed
```

Crea la config de tienda, categorías, marca, 3 productos y los usuarios:

- `admin` / `admin123` (ADMIN)
- `cajero` / `cajero123` (CAJERO)

Si el deploy va a ser público, cambiá esas contraseñas (`prisma/seed.demo.ts` usa `DEMO_ADMIN_PASSWORD`
y `DEMO_CAJERO_PASSWORD`).

## 6) Verificación post-deploy

- `GET https://<dominio>.vercel.app/api/health` → `{"status":"ok"}`
- `GET /api/config` → `factpy.available: false` mientras FACTPY esté apagado (nunca devuelve `recordID`).
- Login con los usuarios del seed y roles correctos.
- Hacer una venta de prueba: confirma que las transacciones interactivas funcionan con el session pooler.

## 7) Limitaciones conocidas en serverless

- El rate limit de `/api/auth/login` vive en memoria por instancia; con auto-scaling no es global.
  Si necesitás protección real, usá Vercel WAF/Rate Limiting o un store compartido.
- No hay cron: la sincronización de estados SIFEN es manual desde `/facturacion`.
- FACTPY llama a una API externa con timeout de 10 s; si se activa, revisá `maxDuration` de la función.
- RLS: no habilitar sin policies (ver `prisma/supabase-rls.sql`). La app accede con credenciales de servidor.
- Rotá cualquier credencial que se haya compartido por chat antes de publicar.
