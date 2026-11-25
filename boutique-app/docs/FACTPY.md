# FACTPY / SIFEN — integración preparada (NO activa)

La app ya tiene los módulos de facturación electrónica implementados **dentro del sistema**:
se consumen las APIs de FACTPY desde el servidor y el usuario nunca sale a la web de FACTPY.
Por defecto `FACTPY_ENABLED=false`: **no hay llamadas de red ni se crean documentos falsos**.

## Activar

1. En FACTPY: configurar empresa, establecimiento, punto de expedición, certificado digital
   y timbrado vigente. Obtener el `recordID` del perfil.
2. Cargar en el entorno:

```env
FACTPY_ENABLED="true"
FACTPY_API_URL="https://api.factpy.com"
FACTPY_RECORD_ID="..."            # secreto de servidor, nunca NEXT_PUBLIC_*
FACTPY_ENVIRONMENT="test"         # o "production"
FACTPY_TIMEOUT_MS="10000"
```

3. En Configuración completar RUC, timbrado, establecimiento (3 dígitos), punto (3 dígitos)
   y plazo de crédito en días. En Render, `FACTPY_RECORD_ID` se carga como variable secreta
   (`sync: false` en `render.yaml`).

`recordID` nunca se envía al navegador: `/api/config` solo expone
`{ enabled, configured, environment, apiUrl, available }`.

## Quién maneja la numeración

Nuestro sistema. Los correlativos por **tipo de documento + establecimiento + punto** se
guardan en `DocumentSequence` y se incrementan con `INSERT ... ON CONFLICT ... RETURNING`,
para no repetir números si hay dos peticiones simultáneas. Las facturas vinculadas a una
venta usan los 7 dígitos de `Sale.invoiceNumber` (el mismo número del comprobante impreso).

## Emisión automática con reintento

- `POST /api/ventas` confirma la venta **primero** y después intenta emitir la factura.
  Si FACTPY falla, la venta queda intacta: un error de red deja el documento `PENDIENTE`
  y un `status:false` lo deja `RECHAZADO` con el mensaje. En ambos casos se puede reenviar
  desde `/facturacion`.
- `POST /api/creditos/abonar` emite un **recibo** por el abono contra la factura aprobada.
- `POST /api/ventas/:id/anular` usa **cancelación** (evento tipo 2) si el documento tiene
  menos de 48 h de aprobado; si no, emite **nota de crédito** con montos negativos.
- `/facturacion` permite sincronizar estados (`estadoDE.php`), ver KUDE/XML en un visor
  interno y reenviar documentos.

## Módulos incluidos

| Módulo | Documentos / eventos |
|---|---|
| Núcleo | Factura contado, factura a crédito (plazo o cuotas), recibo de abono, nota de crédito |
| Eventos | Inutilización (1), cancelación (2), nominación (3) |
| Control | Consulta de estados, CDC, documento, mensaje de error, KUDE/XML, reintentos |
| Adicionales | Autofactura, nota de remisión, anticipo y factura de exportación (emisión manual) |

## Endpoints propios

- `GET /api/facturacion/documentos?estado=&tipo=`
- `GET /api/facturacion/documentos/:id`
- `POST /api/facturacion/documentos/:id/reenviar` (ADMIN)
- `GET /api/facturacion/documentos/:id/archivo/kude` y `/archivo/xml`
- `POST /api/facturacion/estados` (ADMIN)
- `GET|POST /api/facturacion/eventos` (POST solo ADMIN)
- `POST /api/facturacion/manual` (ADMIN/CAJERO)

Los archivos se descargan por un proxy servidor que solo acepta URLs del host configurado
de FACTPY, para no exponer secretos ni permitir SSRF. Las URLs que devuelve FACTPY suelen
venir sin esquema (`api.factpy.com/...`); se normalizan a `https://` antes de guardarlas
y descargarlas.

Los envíos a SIFEN son asíncronos: desde que se genera el documento hasta que hay respuesta
pueden pasar al menos 5 minutos. Por eso los documentos quedan `PENDIENTE` y se consultan
con `estadoDE.php` (Aprobado / Rechazado / Procesando / No encontrado).

## IVA y precisión

Los precios de la tienda ya incluyen IVA 10%. `src/lib/factpy/iva.ts` calcula
`baseGravItem = total / 1.1` y `liqIvaItem = total - base` con 8 decimales, sin
redondearlos a enteros. Los montos del dominio siguen siendo `Int` en guaraníes.

## Referencias

- Documentación oficial: https://docs.factpy.com/
- Manual de uso (PDF): https://api.factpy.com/sifen/factura/static/uploads/manual-factpy.pdf
- Endpoints: https://docs.factpy.com/endpoints-fe/ · https://docs.factpy.com/endpoints-evento/
- API interna (estados): https://docs.factpy.com/api-interna/
- Tablas SIFEN: https://docs.factpy.com/tablas/
- Los comprobantes internosimpresos siguen diciendo **“Sin valor fiscal”** mientras
  FACTPY no esté activo; cuando se active, el documento válido es el DE con CDC.
