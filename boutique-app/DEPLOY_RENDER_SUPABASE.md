# Deploy en Render + Supabase (demo)

## 1) Supabase

1. Creá un proyecto en Supabase.
2. En **Connect**, copiá:
   - **Transaction** (6543) → `DATABASE_URL`, con `?pgbouncer=true&connection_limit=1`
   - **Session** (5432, mismo host `pooler.supabase.com`) → `DIRECT_URL`
   - Evitá el host directo `db.[REF].supabase.co`: suele ser IPv6 y no conecta desde Render/Docker con IPv4.
3. La base se crea sola al arrancar el contenedor: `prisma/migrate.mjs` corre `migrate deploy` usando `DIRECT_URL`.
4. Si querés crear el esquema a mano en una BD **vacía**, ejecutá en SQL Editor `prisma/supabase-init.sql` (generado desde el schema actual, con `BEGIN/COMMIT`). El script de arranque detecta un esquema preexistente y lo basinea antes de aplicar migraciones; no ejecutes este SQL sobre una BD ya migrada.
5. Creá los usuarios demo con `DEMO_ADMIN_PASSWORD` / `DEMO_CAJERO_PASSWORD` (ver `prisma/seed.demo.ts`). No uses `admin123` en público.

## 2) Render

1. Subé el repo a GitHub.
2. **New + > Blueprint** (usa `render.yaml`) o **New Web Service**:
   - Runtime: **Docker**
   - Root Directory: `boutique-app`
   - Dockerfile Path: `./Dockerfile`
   - Health Check Path: `/api/health`
   - Plan: Free (si está disponible)
3. Render construye la imagen y el contenedor ejecuta, en orden:
   validación de `SESSION_SECRET` → `node prisma/migrate.mjs` → `next start`.

## 3) Variables de entorno en Render

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` (ya en `render.yaml`) |
| `SESSION_SECRET` | Secreto aleatorio de **≥32 caracteres** |
| `NEXTAUTH_URL` | `https://<tu-servicio>.onrender.com` |
| `DATABASE_URL` | Supabase Transaction pooler 6543 + `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Supabase Session pooler 5432 |
| `FACTPY_ENABLED` | `false` para la demo; `true` solo con credenciales reales |
| `FACTPY_API_URL` | `https://api.factpy.com` |
| `FACTPY_RECORD_ID` | Secreto de servidor; configurar en Dashboard, nunca en `render.yaml` ni GitHub |
| `FACTPY_ENVIRONMENT` | `test` primero, después `production` |
| `FACTPY_TIMEOUT_MS` | `10000` |

`GET /api/config` expone solo `{ enabled, configured, environment, apiUrl, available }`. Nunca devuelve `recordID`.

## 4) Migraciones

Ya no hace falta correr `migrate deploy` a mano en cada deploy. El contenedor lo hace al arrancar:

```text
node prisma/migrate.mjs  →  baseline si hace falta  →  prisma migrate deploy  →  next start
```

Verificación puntual desde tu máquina, si querés confirmar antes de publicar:

```bash
cd boutique-app
DATABASE_URL="<transaction-6543>" \
DIRECT_URL="<session-5432>" \
npx prisma@6.19.0 migrate status
```

Debe decir `Database schema is up to date!`.

Si preferís aplicar migraciones manualmente una vez:

```bash
npx prisma@6.19.0 migrate deploy
```

No mezcles `supabase-init.sql` con `migrate deploy` sin baseline: el script de arranque ya se encarga de registrar las migraciones como aplicadas cuando el esquema coincide.

## 5) Checklist antes de publicar

- [ ] `git push origin main` con los commits pendientes.
- [ ] Render: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `NEXTAUTH_URL`.
- [ ] Health check `https://<servicio>.onrender.com/api/health` → `{"status":"ok"}`.
- [ ] Login con usuarios demo y roles correctos.
- [ ] `/api/config` → `factpy.available: false` (recordID nunca expuesto).
- [ ] Rotar el `service_role` de Supabase que se compartió en el chat.
- [ ] Cambiar credenciales seed si la demo será pública.
- [ ] FACTPY queda OFF hasta tener `recordID`, RUC/timbrado y environment definido.

## 6) Notas

- **Render Free** puede dormir por inactividad; el primer request tras despertar tarda unos segundos.
- HTTPS lo provee Render. Las cookies son `httpOnly`, `sameSite=lax` y `secure` en producción.
- Comprobantes internos: “Sin valor fiscal” mientras FACTPY esté apagado.
- RLS: ver `prisma/supabase-rls.sql`; no habilitar sin diseñar policies.
