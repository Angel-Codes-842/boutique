INSERT INTO "CashMovement" ("id", "cashSessionId", "type", "amount", "concept", "reference", "createdAt")
SELECT
  gen_random_uuid()::text,
  sale."cashSessionId",
  'INGRESO',
  CASE
    WHEN sale."paymentMethod" = 'EFECTIVO' THEN sale."total"
    ELSE COALESCE((
      SELECT payment."amount"
      FROM "Payment" AS payment
      WHERE payment."saleId" = sale."id"
      ORDER BY payment."createdAt" ASC
      LIMIT 1
    ), 0)
  END,
  'Venta migrada ' || sale."number",
  sale."id",
  CURRENT_TIMESTAMP
FROM "Sale" AS sale
JOIN "CashSession" AS cash_session
  ON cash_session."id" = sale."cashSessionId"
WHERE cash_session."status" = 'ABIERTA'
  AND sale."status" <> 'ANULADA'
  AND sale."paymentMethod" IN ('EFECTIVO', 'CREDITO')
  AND (
    CASE
      WHEN sale."paymentMethod" = 'EFECTIVO' THEN sale."total"
      ELSE COALESCE((
        SELECT payment."amount"
        FROM "Payment" AS payment
        WHERE payment."saleId" = sale."id"
        ORDER BY payment."createdAt" ASC
        LIMIT 1
      ), 0)
    END
  ) > 0
  AND NOT EXISTS (
    SELECT 1
    FROM "CashMovement" AS movement
    WHERE movement."cashSessionId" = sale."cashSessionId"
      AND movement."reference" = sale."id"
      AND movement."concept" LIKE 'Venta %'
  );
