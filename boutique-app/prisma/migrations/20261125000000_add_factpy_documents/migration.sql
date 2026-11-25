-- Documentos electrónicos, eventos SIFEN y numeración controlada (FACTPY).
-- La integración sigue desactivada por defecto (FACTPY_ENABLED=false).

-- Enums
CREATE TYPE "ElectronicDocumentKind" AS ENUM (
  'FACTURA_CONTADO',
  'FACTURA_CREDITO_PLAZO',
  'FACTURA_CREDITO_CUOTAS',
  'RECIBO',
  'NOTA_CREDITO',
  'AUTOFACTURA',
  'NOTA_REMISION',
  'ANTICIPO',
  'FACTURA_EXPORTACION'
);

CREATE TYPE "ElectronicDocumentStatus" AS ENUM (
  'PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO', 'INUTILIZADO'
);

CREATE TYPE "FactpyEventType" AS ENUM ('CANCELACION', 'INUTILIZACION', 'NOMINACION');

CREATE TYPE "FactpyEventStatus" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');

-- Campos de cliente requeridos por SIFEN
ALTER TABLE "Customer"
  ADD COLUMN "documentType" TEXT,
  ADD COLUMN "cpais" TEXT NOT NULL DEFAULT 'PRY',
  ADD COLUMN "numCasa" INTEGER;

-- Configuración de facturación
ALTER TABLE "StoreConfig"
  ADD COLUMN "creditoPlazoDias" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "factpyContingencia" BOOLEAN NOT NULL DEFAULT false;

-- Documentos electrónicos
CREATE TABLE "ElectronicDocument" (
  "id" TEXT NOT NULL,
  "receiptid" TEXT NOT NULL,
  "kind" "ElectronicDocumentKind" NOT NULL,
  "status" "ElectronicDocumentStatus" NOT NULL DEFAULT 'PENDIENTE',
  "saleId" TEXT,
  "paymentId" TEXT,
  "customerId" TEXT,
  "establecimiento" TEXT NOT NULL,
  "punto" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "timbrado" TEXT,
  "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payload" JSONB NOT NULL,
  "cdc" TEXT,
  "cdcSpace" TEXT,
  "link" TEXT,
  "xmlLink" TEXT,
  "kude" TEXT,
  "code" TEXT,
  "mensaje" TEXT,
  "documento" TEXT,
  "numeroTr" TEXT,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "ultimoError" TEXT,
  "enviadoAt" TIMESTAMP(3),
  "aprobadoAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ElectronicDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectronicDocument_receiptid_key" ON "ElectronicDocument"("receiptid");
CREATE INDEX "ElectronicDocument_status_idx" ON "ElectronicDocument"("status");
CREATE INDEX "ElectronicDocument_saleId_idx" ON "ElectronicDocument"("saleId");
CREATE INDEX "ElectronicDocument_customerId_idx" ON "ElectronicDocument"("customerId");
CREATE INDEX "ElectronicDocument_createdAt_idx" ON "ElectronicDocument"("createdAt");

-- Eventos
CREATE TABLE "FactpyEvent" (
  "id" TEXT NOT NULL,
  "tipo" "FactpyEventType" NOT NULL,
  "status" "FactpyEventStatus" NOT NULL DEFAULT 'PENDIENTE',
  "documentId" TEXT,
  "cdc" TEXT,
  "tipoDoc" TEXT,
  "timbrado" TEXT,
  "establecimiento" TEXT,
  "punto" TEXT,
  "desde" TEXT,
  "hasta" TEXT,
  "motivo" TEXT NOT NULL,
  "nombre" TEXT,
  "ruc" TEXT,
  "correo" TEXT,
  "code" TEXT,
  "fechaRespuesta" TEXT,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "ultimoError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FactpyEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FactpyEvent_status_idx" ON "FactpyEvent"("status");
CREATE INDEX "FactpyEvent_createdAt_idx" ON "FactpyEvent"("createdAt");

-- Secuencias por establecimiento/punto/tipo
CREATE TABLE "DocumentSequence" (
  "key" TEXT NOT NULL,
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("key")
);

-- Relaciones
ALTER TABLE "ElectronicDocument"
  ADD CONSTRAINT "ElectronicDocument_saleId_fkey"
  FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument"
  ADD CONSTRAINT "ElectronicDocument_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ElectronicDocument"
  ADD CONSTRAINT "ElectronicDocument_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FactpyEvent"
  ADD CONSTRAINT "FactpyEvent_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "ElectronicDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
