/**
 * Tipos del JSON de FACTPY v1 (SIFEN / DNIT Paraguay).
 * Basado en https://docs.factpy.com/ y https://github.com/sfabianl/factpy-json.
 *
 * Los montos de este sistema son Int en guaraníes. FACTPY espera
 * baseGravItem / liqIvaItem con hasta 8 decimales: el mapper los calcula
 * sin perder precisión (IVA 10% incluido en el precio).
 */

export interface FactpyCliente {
  ruc: string;
  nombre: string;
  direccion?: string;
  cpais?: string;
  correo?: string;
  telefono?: string;
  celular?: string;
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
  ivaAfecta: number; // 1 gravado, 2 exonerado, 3 exento, 4 parcial
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  baseGravItem: number;
  liqIvaItem: number;
  descuento?: number;
  anticipo?: number;
}

export interface FactpyPago {
  tipoPago: string; // iTiPago
  monto: number;
  name?: string;
  referencia?: string;
  entregado?: number;
  vuelto?: number;
}

export interface FactpyCredito {
  condicionCredito: 1 | 2;
  descripcion?: string; // máx. 10 caracteres
  cantidadCuota?: number;
  cuotas?: Array<{ numero: number; monto: number; fechaVencimiento: string }>;
}

export interface FactpyDocumentoAsociado {
  cdcAsociado?: string;
  remision?: boolean;
  tipoDocumentoAsoc?: string;
  cdcAsociadoCompleto?: string;
  establecimientoAsoc?: string;
  puntoAsoc?: string;
  numeroAsoc?: string;
  tipoDocuemntoIm?: string;
  fechaDocIm?: string;
  timbradoAsoc?: string;
}

/** Payload base compartido por facturas, notas y anticipos. */
export interface FactpyFacturaPayload {
  fecha: string; // "Y-m-d H:i:s"
  establecimiento: string; // 3 dígitos
  punto: string; // 3 dígitos
  numero: string; // 7 dígitos
  descripcion?: string;
  tipoDocumento: number; // 1 factura, 4 autofactura, 5 nota de crédito, 7 remisión
  tipoEmision: 1 | 2; // 1 normal, 2 contingencia
  tipoTransaccion: number | string;
  receiptid: string;
  condicionPago: 1 | 2;
  moneda: "PYG";
  cambio: number;
  cliente: FactpyCliente;
  codigoSeguridadAleatorio: string; // 9 dígitos
  items: FactpyItem[];
  pagos: FactpyPago[] | Array<Record<string, never>>;
  totalPago: number;
  totalRedondeo: number;
  credito?: FactpyCredito;
  documentoAsociado?: FactpyDocumentoAsociado;
  documentosAsociados?: FactpyDocumentoAsociado[];
  esExportacion?: number;
  exportacion?: Record<string, unknown>;
  autofactura?: Record<string, unknown>;
  transporte?: Array<Record<string, unknown>>;
  pais?: string;
  totalGs?: number;
  cdcAsociado?: string;
}

export interface FactpyReciboPayload {
  tipoDocumento: 0;
  establecimiento: string;
  punto: string;
  numero: string;
  fecha: string;
  receiptid: string;
  concepto: string;
  codigoSeguridadAleatorio: string;
  cliente: FactpyCliente;
  items: Array<{
    documento: string;
    importeDocumento: number;
    vencimientoDocumento?: string;
    importePago: number;
    metodoPago: number;
    numeroCheque?: string;
  }>;
}

export type FactpyDocumentPayload = FactpyFacturaPayload | FactpyReciboPayload | Record<string, unknown>;

export interface FactpyEventPayload {
  tipoEvento: 1 | 2 | 3;
  cdc?: string;
  motivo?: string;
  timbrado?: string;
  tipoDoc?: string;
  establecimiento?: string;
  punto?: string;
  desde?: string;
  hasta?: string;
  nombre?: string;
  ruc?: string;
  correo?: string;
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

export interface FactpyEstadoItem {
  receiptid: string;
  cdc?: string;
  estado: string;
  mensaje?: string;
  documento?: string;
  numero_tr?: string;
}
