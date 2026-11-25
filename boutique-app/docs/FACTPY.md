# FACTPY — integración futura (NO activa)

Este proyecto está preparado para integrar facturación electrónica con
[FACTPY](https://factpy.com) / SIFEN (DNIT Paraguay), pero **la integración
está deshabilitada y no hace llamadas de red**.

## Referencias

- Documentación oficial: https://docs.factpy.com/
- Ejemplos de JSON v1: https://github.com/sfabianl/factpy-json
- Endpoint (cuando se active): `POST https://api.factpy.com/facturacion-api/data.php`
  con `multipart/form-data`: `dataJson` (string JSON) + `recordID`.

## Variables de entorno

Agregar al `.env` / Render solo cuando se vaya a activar:

```env
FACTPY_ENABLED="false"
FACTPY_API_URL="https://api.factpy.com"
FACTPY_RECORD_ID=""
FACTPY_ENVIRONMENT="test"
FACTPY_TIMEOUT_MS="10000"
```

`FACTPY_RECORD_ID` es un secreto de servidor: **nunca** usar prefijo
`NEXT_PUBLIC_`, nunca enviarlo al cliente ni commitearlo.

## Archivos del scaffolding

- `src/lib/factpy/config.ts` — lectura de variables y estado seguro para la UI.
- `src/lib/factpy/types.ts` — tipos del JSON de factura contado FACTPY v1 y
  equivalencia de métodos de pago a códigos `iTiPago`.
- `src/lib/factpy/client.ts` — `emitirFacturaFactpy()` lanza un error
  explícito; no hace requests.
- `src/app/api/config/route.ts` — expone solo `factpy.enabled`,
  `configured`, `environment`, `apiUrl` y `available: false`.

## Pendiente para activar

1. Mapear `Sale` + `SaleItem` + `Customer` + `StoreConfig` al payload
   `FactpyFacturaContadoPayload` (`receiptid` único, `numero` de 7 dígitos,
   `codigoSeguridadAleatorio` de 9 dígitos).
2. Calcular `baseGravItem` y `liqIvaItem` con hasta 8 decimales (IVA 10%).
   Los montos de este sistema son enteros en guaraníes.
3. Implementar el `FormData` + `fetch` con `AbortSignal.timeout` y manejo de
   `FactpyResponse` (`status: false` → menunjukkan `code`).
4. Persistir `cdc`, `link`, `xmlLink`, `kude` en la venta (requiere migración).
5. Eventos de SIFEN (anulación/nota de crédito) y ambiente Producción.

Hasta entonces, los comprobantes siguen siendo **manuales e internos**, con
la leyenda **"Sin valor fiscal"**.
