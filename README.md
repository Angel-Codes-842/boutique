# Boutique POS

MVP de facturación, caja, inventario y POS para boutique (Paraguay, PYG enteros).

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma + PostgreSQL
- Docker Compose para local
- Vercel + Supabase para producción (ver `boutique-app/DEPLOY_VERCEL_SUPABASE.md`)
- Render + Supabase para demo pública

## Local (Docker)
Ver `INSTALAR.md`.

## Producción (Vercel + Supabase)
Ver `boutique-app/DEPLOY_VERCEL_SUPABASE.md`.

## Demo pública (Render + Supabase)
Ver `boutique-app/DEPLOY_RENDER_SUPABASE.md`.

SQL para Supabase:
- `boutique-app/prisma/supabase-init.sql` (esquema)
- `boutique-app/prisma/supabase-seed.sql` (config mínima opcional)
- `boutique-app/prisma/supabase-rls.sql` (nota RLS)

## Seguridad
- Cambiar credenciales seed/demo.
- Configurar `SESSION_SECRET` fuerte.
- No exponer DB.
- Comprobantes sin valor fiscal.
