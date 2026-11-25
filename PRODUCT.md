# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Cajero/a en mostrador:** en el turno, vende, cobra, abre y cierra la caja, registra movimientos y emite comprobantes.
- **Administrador/a:** supervisa cajas, inventario, créditos y reportes; puede anular ventas y reabrir la caja sin borrar el cierre anterior.
- **Dueño/a o gerente:** consulta ventas, cobros, deudas y stock para tomar decisiones, sin operar cada venta.

## Product Purpose

MVP web de punto de venta para una boutique en Paraguay. Permite vender con carrito, cobrar en efectivo/tarjeta/transferencia/crédito, controlar el efectivo de la caja, registrar deudas y abonos, mantener el inventario y consultar reportes. El éxito es que el cajero termine el turno con la caja conciliada y que el administrador pueda ver ventas, cobros y stock con información confiable.

## Positioning

Un solo flujo integra **caja + créditos + stock**, con operación simple para quien está en el mostrador e información clara para quien decide. La facturación electrónica SIFEN/FACTPY queda preparada para una etapa futura, pero hoy los comprobantes son internos y no tienen valor fiscal.

## Operating Context

- Uso local con Docker en el equipo de la boutique; demostración pública en Render + Supabase.
- La caja debe estar abierta para vender y para registrar abonos de crédito.
- El cierre de caja se hace por conteo de billetes/monedas y deja registrada la diferencia contra el efectivo esperado.
- La reapertura de caja crea una sesión nueva con el efectivo contado de la última sesión; el cierre previo queda intacto como auditoría.
- El inventario maneja stock real, movimientos y ajustes con validaciones.
- `/reportes` es de uso exclusivo del administrador.
- La configuración separa ticket y factura manual; la app es instalable como PWA.

## Capabilities and Constraints

- Montos siempre en guaraníes (PYG), guardados como enteros (`Int`) y formateados con `formatGuarani()`.
- Roles de acceso con usuario y contraseña; acceso limitado por intentos fallidos de inicio de sesión.
- Comprobantes manuales e internos con la leyenda **“Sin valor fiscal”**; no sustituyen facturación electrónica.
- FACTPY/SIFEN está scaffoldizado pero **deshabilitado**: no emite documentos ni hace llamadas de red todavía.
- Demo pública con credenciales rotadas; las cuentas seed locales no se usan en ella.
- Los secretos de servidor nunca se exponen al cliente ni se versionan.

## Brand Commitments

- Nombre del producto: **Boutique POS**. “Mi Boutique” es solo el valor inicial de configuración de la tienda, no la identidad confirmada.
- Interfaz y copy en español.
- Los comprobantes deben mantener visible su condición de “Sin valor fiscal”.

## Evidence on Hand

- `README.md`: propósito, stack, instalación local y demo pública.
- `INSTALAR.md`: workflow de operación local, seed y límites de la instalación.
- `boutique-app/DEPLOY_RENDER_SUPABASE.md`: despliegue de la demo.
- `boutique-app/docs/FACTPY.md`: alcance futuro de facturación electrónica.
- `boutique-app/prisma/schema.prisma` y rutas bajo `boutique-app/src/app/api/`: capacidades y roles implementados.
- No hay diseño visual confirmado (`DESIGN.md`), assets de marca ni testimonios/casos reales; no deben inventarse.

## Product Principles

1. No vender ni abonar sin una caja abierta y identificada.
2. Cerrar la caja sin destruir el registro anterior; cualquier reapertura es una sesión nueva y auditada.
3. El flujo del cajero debe ser corto y difícil de equivocar; la supervisión del administrador debe ser completa.
4. El dinero se expresa siempre en guaraníes enteros y se concilia por conteo real.
5. No afirmar validez fiscal mientras FACTPY esté deshabilitado.
6. La demo pública usa secretos propios y credenciales rotadas, nunca las de seed local.
