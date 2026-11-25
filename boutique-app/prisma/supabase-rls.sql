-- RLS opcional para Supabase
-- Este proyecto accede a Postgres con Prisma usando credenciales de servidor (DATABASE_URL).
-- Si SOLO accedes por servidor (Next.js/Vercel) y NO usas PostgREST/anon key desde el cliente,
-- puedes dejar RLS desactivado en estas tablas.
-- Si habilitas RLS, el acceso directo desde Supabase Data API/anon quedará bloqueado sin policies.
-- No crear policies permisivas para anon/authenticated salvo que diseñes un modelo de seguridad Supabase Auth.

-- Ejemplo (NO ejecutar por defecto):
-- ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
-- ... repetir por tabla ...
