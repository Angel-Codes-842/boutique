# Deploy en Render + Supabase (demo)

## 1) Supabase
1. Crea un proyecto en Supabase.
2. En el dashboard del proyecto, hacé clic en **Connect** (barra superior; la sección "Connection string" ya no está en Settings > Database). Copia:
   - Modo **Transaction** (6543) para `DATABASE_URL` (agrega `?pgbouncer=true&connection_limit=1`)
   - Modo **Session** (5432, mismo host `pooler.supabase.com`) para `DIRECT_URL`
   - Evita el host directo `db.[REF].supabase.co`: suele ser IPv6 y no conecta desde Docker/Render con IPv4.
3. En **SQL Editor**, ejecuta `prisma/supabase-init.sql` **o** usa `prisma migrate deploy` (no ambos sin baselinar; ver §4).
4. (Opcional) ejecuta `prisma/supabase-seed.sql`.
5. Crea usuarios iniciales de forma segura (no uses seed con passwords por defecto en público). Puedes usar `prisma/seed.demo.ts` localmente con `DEMO_ADMIN_PASSWORD` y `DEMO_CAJERO_PASSWORD` apuntando a la DB de Supabase, o crear usuarios desde un flujo controlado.

## 2) Render
1. Sube el repo a GitHub.
2. En Render: **New + > Blueprint** (usa `render.yaml`) o **New Web Service**.
3. Si es Web Service manual:
   - Runtime: **Docker**
   - Root Directory: `boutique-app`
   - Dockerfile Path: `./Dockerfile`
   - Health Check Path: `/api/health`
   - Plan: Free (si está disponible)

## 3) Variables de entorno en Render
- `NODE_ENV=production`
- `SESSION_SECRET` = secreto aleatorio largo (>=32 chars)
- `NEXTAUTH_URL` = `https://<tu-servicio>.onrender.com`
- `DATABASE_URL` = Supabase pooler 6543
- `DIRECT_URL` = Supabase directa 5432

## 4) Migraciones
El `Dockerfile`/build no ejecuta `migrate deploy` automáticamente contra Supabase. Antes del primer uso (o en cada cambio de esquema), ejecuta:

```bash
# desde tu máquina, con DATABASE_URL/DIRECT_URL de Supabase exportadas
cd boutique-app
npx prisma@6.19.0 migrate deploy
```

Alternativa: ejecutar el SQL `prisma/supabase-init.sql` en Supabase para la base inicial. Si ya corriste ese SQL y no existe `_prisma_migrations`, `migrate deploy` dará `P3005`; en ese caso corré `node prisma/migrate.mjs` (o `docker compose run --rm migrate`), que baselinea el esquema existente y aplica el resto de migraciones.

## 5) Notas
- **Render Free** puede dormir por inactividad y tiene límites; verifica plan actual.
- **No expongas Postgres**. Usa Supabase administrado.
- **Cambia credenciales seed/demo**. No uses admin/admin123 en público.
- **HTTPS** lo provee Render. Cookies de sesión ya son `httpOnly`, `sameSite=lax`, `secure` en producción.
- **Comprobantes**: "Sin valor fiscal". Demo con datos de prueba.
- **RLS**: ver `prisma/supabase-rls.sql`; por defecto no habilitar sin diseñar policies.
