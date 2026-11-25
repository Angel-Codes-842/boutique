-- Seed mínimo para demo (opcional)
-- IMPORTANTE: reemplaza los hashes por hashes scrypt generados por tu app.
-- Este archivo NO incluye contraseñas en texto plano.
-- Recomendado: crear usuarios desde la app o ejecutar un script Node con hashPassword.

INSERT INTO "StoreConfig" ("id", "name", "ruc", "address", "phone", "ticketPrefix", "ticketNumber", "establecimiento", "puntoExpedicion", "timbrado", "timbradoVigencia", "invoiceNumber", "updatedAt")
VALUES ('default-store-config', 'Mi Boutique', NULL, NULL, NULL, 'T', 1, '001', '001', NULL, NULL, 1, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
