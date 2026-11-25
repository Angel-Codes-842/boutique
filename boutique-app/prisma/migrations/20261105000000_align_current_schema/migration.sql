DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'DocumentType'
  ) THEN
    CREATE TYPE "DocumentType" AS ENUM ('TICKET', 'FACTURA');
  END IF;
END
$$;

ALTER TABLE "Sale"
  ADD COLUMN IF NOT EXISTS "documentType" "DocumentType" NOT NULL DEFAULT 'TICKET',
  ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;

ALTER TABLE "StoreConfig"
  ADD COLUMN IF NOT EXISTS "establecimiento" TEXT NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "puntoExpedicion" TEXT NOT NULL DEFAULT '001',
  ADD COLUMN IF NOT EXISTS "timbrado" TEXT,
  ADD COLUMN IF NOT EXISTS "timbradoVigencia" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invoiceNumber" INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'email'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'username'
  ) THEN
    ALTER TABLE "User" RENAME COLUMN "email" TO "username";
    DROP INDEX IF EXISTS "User_email_key";
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'username'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "username" TEXT;
    UPDATE "User" SET "username" = 'user-' || "id" WHERE "username" IS NULL;
    ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
  END IF;
END
$$;

UPDATE "User"
SET "username" = 'user-' || "id"
WHERE "username" IS NULL;

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
