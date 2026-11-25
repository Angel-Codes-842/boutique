/**
 * Tipos del JSON de FACTPY v1 (SIFEN / DNIT Paraguay).
 * Basado en https://docs.factpy.com/factura-contado/ y
 * https://github.com/sfabianl/factpy-json
 *
 * Los montos de este sistema son Int en guaraníes. FACTPY espera
 * baseGravItem / liqIvaItem con hasta 8 decimales: el mapper pendiente
 * deberá hacer esa conversión (IVA 10% por defecto) sin redondear esos dos
 * campos.
 */

export interface FactpyCliente {
  ruc: string;
  nombre: string;
  direccion?: string;
  cpais?: string;
  correo?: string;
  numCasa?: number | string;
  diplomatico?: boolean;
  dncp?: number | string;
}

export interface FactpyItem {
  descripcion: string;
  infoItem?: string;
  codigo?: string | null;
  unidadMedida: number; // 77 = Unidad
  ivaTasa: number; // 10 = IVA 10%
  ivaAfecta: number; // 1 = gravado, 2 = exonerado, 3 = exento, 4 = parcial
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  baseGravItem: number;
  liqIvaItem: number;
}

export interface FactpyPago {
  tipoPago: string; // 1 efectivo, 3 crédito, 4 débito, 5 transferencia, 99 otro
  monto: number;
}

export interface FactpyFacturaContadoPayload {
  fecha: string; // "Y-m-d H:i:s"
  establecimiento: string; // 3 dígitos
  punto: string; // 3 dígitos
  numero: string; // últimos 7 dígitos
  descripcion?: string;
  tipoDocumento: 1; // factura electrónica
  tipoEmision: 1 | 2; // 1 normal, 2 contingencia
  tipoTransaccion: number; // 1 venta de mercadería
  receiptid: string; // ID interno de este sistema, no repetible
  condicionPago: 1 | 2; // 1 contado, 2 crédito
  moneda: "PYG" | "USD" | "EUR";
  cambio?: number;
  cliente: FactpyCliente;
  codigoSeguridadAleatorio: string; // 9 dígitos, único por documento
  items: FactpyItem[];
  pagos: FactpyPago[];
  totalPago: number;
  totalRedondeo: number;
}

export interface FactpySuccessResponse {
  status: true;
  recordID: string;
  cdc: string;
  cdcSpace: string;
  link: string;
  code: string;
  xmlLink: string;
  kude: string;
}

export interface FactpyErrorResponse {
  status: false;
  code: string;
}

export type FactpyResponse = FactpySuccessResponse | FactpyErrorResponse;

/** Equivalencia de nuestros métodos de pago a códigos iTiPago del SIFEN. */
export const METODOS_PAGO_FACTPY = {
  EFECTIVO: "1",
  TARJETA: "4",
  TRANSFERENCIA: "5",
  CREDITO: "99",
  MIXTO: "99",
} as const;
