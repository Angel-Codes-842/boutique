/** Códigos SIFEN / FACTPY usados por el mapper. Ver docs.factpy.com/tablas. */

export const TIPO_DOCUMENTO = {
  RECIBO: 0,
  FACTURA: 1,
  AUTOFACTURA: 4,
  NOTA_CREDITO: 5,
  NOTA_REMISION: 7,
} as const;

export const CONDICION_PAGO = {
  CONTADO: 1,
  CREDITO: 2,
} as const;

export const TIPO_EMISION = {
  NORMAL: 1,
  CONTINGENCIA: 2,
} as const;

export const TIPO_TRANSACCION = {
  VENTA_MERCADERIA: 1,
  ANTICIPO: 9,
} as const;

export const IVA = {
  TASA: 10,
  AFECTA_GRAVADO: 1,
  AFECTA_EXONERADO: 2,
  AFECTA_EXENTO: 3,
  AFECTA_PARCIAL: 4,
  UNIDAD_MEDIDA: 77,
} as const;

/** Códigos iTiPago. TARJETA usa débito (4) por defecto. */
export const METODOS_PAGO_FACTPY = {
  EFECTIVO: "1",
  CHEQUE: "2",
  TARJETA_CREDITO: "3",
  TARJETA: "4",
  TRANSFERENCIA: "5",
  BILLETERA: "7",
  OTRO: "99",
} as const;

export const TIPO_EVENTO = {
  INUTILIZACION: 1,
  CANCELACION: 2,
  NOMINACION: 3,
} as const;

export const TIPO_IDENTIDAD = {
  RUC: 1,
  CI: 1,
  PASAPORTE: 2,
  CEDULA_EXTRANJERA: 3,
  CARNET_RESIDENCIA: 4,
  INNOMINADO: 5,
  DIPLOMATICO: 6,
  OTRO: 9,
} as const;

export const MONEDA = "PYG" as const;
