/** Mappers puros: dominio Boutique -> JSON FACTPY/SIFEN. Sin efectos de red. */

import {
  CONDICION_PAGO,
  IVA,
  METODOS_PAGO_FACTPY,
  MONEDA,
  TIPO_DOCUMENTO,
  TIPO_EMISION,
  TIPO_TRANSACCION,
} from "./codes";
import { desglosarIva, precision8 } from "./iva";
import type {
  FactpyCliente,
  FactpyCredito,
  FactpyFacturaPayload,
  FactpyItem,
  FactpyPago,
  FactpyReciboPayload,
} from "./types";
import { padCodigo } from "./security";

export interface ClienteParaFactpy {
  ruc?: string | null;
  nombre: string;
  direccion?: string | null;
  correo?: string | null;
  telefono?: string | null;
  cpais?: string | null;
  numCasa?: number | null;
  documentType?: string | null;
}

export interface ItemParaFactpy {
  descripcion: string;
  codigo?: string | null;
  cantidad: number;
  precioUnitario: number;
  total: number;
  exento?: boolean;
}

export interface PagoParaFactpy {
  metodo: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "MIXTO" | "CREDITO";
  monto: number;
}

export interface OpcionesDocumento {
  fecha: Date;
  establecimiento: string;
  punto: string;
  numero: string;
  receiptid: string;
  codigoSeguridad: string;
  contingencia?: boolean;
}

export interface DatosFactura extends OpcionesDocumento {
  cliente: ClienteParaFactpy;
  items: ItemParaFactpy[];
  pagos: PagoParaFactpy[];
  total: number;
  descripcion?: string;
  esCredito?: boolean;
  credito?: { condicionCredito: 1 | 2; plazoDias?: number; cantidadCuota?: number; cuotas?: Array<{ numero: number; monto: number; fechaVencimiento: string }> };
  documentosAsociados?: Array<{ cdcAsociado: string }>;
  exportacion?: Record<string, unknown>;
  esAnticipo?: boolean;
}

export interface DatosRecibo extends OpcionesDocumento {
  cliente: ClienteParaFactpy;
  concepto: string;
  items: Array<{
    documento: string;
    importeDocumento: number;
    importePago: number;
    metodo: PagoParaFactpy["metodo"];
    vencimientoDocumento?: string;
    numeroCheque?: string;
  }>;
}

export function formatearFechaFactpy(fecha: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;
}

function mapearCliente(cliente: ClienteParaFactpy): FactpyCliente {
  return {
    ruc: (cliente.ruc ?? "").trim(),
    nombre: cliente.nombre.trim() || "SIN NOMBRE",
    direccion: cliente.direccion?.trim() || "N/A",
    cpais: cliente.cpais?.trim() || "PRY",
    correo: cliente.correo?.trim() || "",
    telefono: cliente.telefono?.trim() || "",
    numCasa: cliente.numCasa ?? 0,
    diplomatico: false,
    dncp: 0,
  };
}

function mapearItem(item: ItemParaFactpy): FactpyItem {
  const tasa = item.exento ? 0 : IVA.TASA;
  const afecta = item.exento ? IVA.AFECTA_EXENTO : IVA.AFECTA_GRAVADO;
  const { baseGravItem, liqIvaItem } = item.exento
    ? { baseGravItem: 0, liqIvaItem: 0 }
    : desglosarIva(item.total);
  return {
    descripcion: item.descripcion.slice(0, 500),
    codigo: item.codigo ?? undefined,
    unidadMedida: IVA.UNIDAD_MEDIDA,
    ivaTasa: tasa,
    ivaAfecta: afecta,
    cantidad: item.cantidad,
    precioUnitario: precision8(item.precioUnitario),
    precioTotal: precision8(item.total),
    baseGravItem,
    liqIvaItem,
  };
}

function metodoPago(metodo: PagoParaFactpy["metodo"]): string {
  const mapa: Record<PagoParaFactpy["metodo"], string> = {
    EFECTIVO: METODOS_PAGO_FACTPY.EFECTIVO,
    TARJETA: METODOS_PAGO_FACTPY.TARJETA,
    TRANSFERENCIA: METODOS_PAGO_FACTPY.TRANSFERENCIA,
    MIXTO: METODOS_PAGO_FACTPY.OTRO,
    CREDITO: METODOS_PAGO_FACTPY.OTRO,
  };
  return mapa[metodo];
}

function construirCredito(datos: DatosFactura): FactpyCredito | undefined {
  if (!datos.esCredito || !datos.credito) return undefined;
  const { condicionCredito, plazoDias = 30, cantidadCuota, cuotas } = datos.credito;
  if (condicionCredito === 2 && cuotas?.length) {
    return {
      condicionCredito: 2,
      cantidadCuota: cantidadCuota ?? cuotas.length,
      cuotas: cuotas.map((cuota) => ({
        numero: cuota.numero,
        monto: precision8(cuota.monto),
        fechaVencimiento: cuota.fechaVencimiento,
      })),
    };
  }
  return {
    condicionCredito: 1,
    descripcion: `${plazoDias} dias`.slice(0, 10),
  };
}

export function construirFactura(datos: DatosFactura): FactpyFacturaPayload {
  if (!datos.items.length) throw new Error("La factura debe tener al menos un ítem");
  const esCredito = Boolean(datos.esCredito);
  const pagos: FactpyPago[] | Array<Record<string, never>> = esCredito
    ? [{}]
    : datos.pagos.length
      ? datos.pagos.map((pago) => ({ tipoPago: metodoPago(pago.metodo), monto: precision8(pago.monto) }))
      : [{ tipoPago: METODOS_PAGO_FACTPY.EFECTIVO, monto: precision8(datos.total) }];

  const payload: FactpyFacturaPayload = {
    fecha: formatearFechaFactpy(datos.fecha),
    establecimiento: padCodigo(datos.establecimiento),
    punto: padCodigo(datos.punto),
    numero: datos.numero,
    descripcion: datos.descripcion || "Venta boutique",
    tipoDocumento: TIPO_DOCUMENTO.FACTURA,
    tipoEmision: datos.contingencia ? TIPO_EMISION.CONTINGENCIA : TIPO_EMISION.NORMAL,
    tipoTransaccion: datos.esAnticipo ? TIPO_TRANSACCION.ANTICIPO : TIPO_TRANSACCION.VENTA_MERCADERIA,
    receiptid: datos.receiptid,
    condicionPago: esCredito ? CONDICION_PAGO.CREDITO : CONDICION_PAGO.CONTADO,
    moneda: MONEDA,
    cambio: 0,
    cliente: mapearCliente(datos.cliente),
    codigoSeguridadAleatorio: datos.codigoSeguridad,
    items: datos.items.map(mapearItem),
    pagos,
    totalPago: precision8(datos.total),
    totalRedondeo: 0,
  };

  const credito = construirCredito(datos);
  if (credito) payload.credito = credito;
  if (datos.documentosAsociados?.length) payload.documentosAsociados = datos.documentosAsociados;
  if (datos.exportacion) {
    payload.esExportacion = 1;
    payload.exportacion = datos.exportacion;
  }
  return payload;
}

export function construirNotaCredito(
  datos: DatosFactura & { cdcAsociado: string; motivo: string },
): FactpyFacturaPayload {
  const base = construirFactura({ ...datos, esCredito: false });
  return {
    ...base,
    descripcion: datos.motivo.slice(0, 500),
    tipoDocumento: TIPO_DOCUMENTO.NOTA_CREDITO,
    items: base.items.map((item) => ({
      ...item,
      cantidad: -Math.abs(item.cantidad),
      precioTotal: -Math.abs(item.precioTotal),
      baseGravItem: -Math.abs(item.baseGravItem),
      liqIvaItem: -Math.abs(item.liqIvaItem),
    })),
    pagos: base.pagos.map((pago) => {
      if ("tipoPago" in pago) return { ...pago, monto: -Math.abs(pago.monto) };
      return pago;
    }) as FactpyPago[],
    totalPago: -Math.abs(base.totalPago),
    documentoAsociado: {
      remision: false,
      tipoDocumentoAsoc: String(TIPO_DOCUMENTO.FACTURA),
      cdcAsociado: datos.cdcAsociado,
    },
  };
}

export function construirRecibo(datos: DatosRecibo): FactpyReciboPayload {
  if (!datos.items.length) throw new Error("El recibo debe tener al menos un documento");
  return {
    tipoDocumento: TIPO_DOCUMENTO.RECIBO,
    establecimiento: padCodigo(datos.establecimiento),
    punto: padCodigo(datos.punto),
    numero: datos.numero,
    fecha: formatearFechaFactpy(datos.fecha),
    receiptid: datos.receiptid,
    concepto: datos.concepto.slice(0, 500),
    codigoSeguridadAleatorio: datos.codigoSeguridad,
    cliente: mapearCliente(datos.cliente),
    items: datos.items.map((item) => ({
      documento: item.documento,
      importeDocumento: precision8(item.importeDocumento),
      importePago: precision8(item.importePago),
      metodoPago: Number(metodoPago(item.metodo)),
      ...(item.vencimientoDocumento ? { vencimientoDocumento: item.vencimientoDocumento } : {}),
      ...(item.numeroCheque ? { numeroCheque: item.numeroCheque } : {}),
    })),
  };
}
