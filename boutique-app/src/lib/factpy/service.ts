/**
 * Orquestación de facturación electrónica: crea el registro local, envía a
 * FACTPY y persiste CDC/estado. Si FACTPY está desactivado no escribe ni llama
 * a la red, para no contaminar la base con documentos falsos.
 */

import type { ElectronicDocumentKind, FactpyEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFactpyConfig, normalizarUrlFactpy } from "./config";
import {
  consultarEstadosFactpy,
  descargarArchivoFactpy,
  emitirDocumentoFactpy,
  enviarEventoFactpy,
  FactpyApiError,
} from "./client";
import { construirFactura, construirNotaCredito, construirRecibo } from "./mapper";
import { siguienteNumero } from "./numeracion";
import { generarCodigoSeguridad, generarReceiptid, numeroDesdeFactura } from "./security";
import type { FactpyDocumentPayload, FactpyEventPayload, FactpySuccessResponse } from "./types";

export type EstadoEmision = "APROBADO" | "RECHAZADO" | "PENDIENTE" | "OMITIDO" | "ERROR";

export interface ResultadoEmision {
  estado: EstadoEmision;
  documentId?: string;
  mensaje?: string;
}

function integracionActiva(): boolean {
  const config = getFactpyConfig();
  return config.enabled && config.isConfigured;
}

function mensajeSeguro(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 400);
  return "Error desconocido al procesar con FACTPY";
}

async function aplicarRespuesta(documentId: string, respuesta: FactpySuccessResponse) {
  await prisma.electronicDocument.update({
    where: { id: documentId },
    data: {
      status: "APROBADO",
      cdc: respuesta.cdc || null,
      cdcSpace: respuesta.cdcSpace || null,
      link: respuesta.link ? normalizarUrlFactpy(respuesta.link) : null,
      xmlLink: respuesta.xmlLink ? normalizarUrlFactpy(respuesta.xmlLink) : null,
      kude: respuesta.kude ? normalizarUrlFactpy(respuesta.kude) : null,
      code: respuesta.code || null,
      mensaje: null,
      ultimoError: null,
      aprobadoAt: new Date(),
    },
  });
}

async function registrarYEmitir(
  datos: {
    kind: ElectronicDocumentKind;
    receiptid: string;
    payload: FactpyDocumentPayload;
    establecimiento: string;
    punto: string;
    numero: string;
    timbrado?: string | null;
    saleId?: string;
    paymentId?: string;
    customerId?: string | null;
  },
): Promise<ResultadoEmision> {
  const documento = await prisma.electronicDocument.create({
    data: {
      receiptid: datos.receiptid,
      kind: datos.kind,
      status: "PENDIENTE",
      payload: datos.payload as object,
      establecimiento: datos.establecimiento,
      punto: datos.punto,
      numero: datos.numero,
      timbrado: datos.timbrado ?? null,
      saleId: datos.saleId,
      paymentId: datos.paymentId,
      customerId: datos.customerId,
      intentos: 1,
      enviadoAt: new Date(),
    },
  });

  try {
    const respuesta = await emitirDocumentoFactpy(datos.payload);
    await aplicarRespuesta(documento.id, respuesta);
    return { estado: "APROBADO", documentId: documento.id };
  } catch (error) {
    const mensaje = mensajeSeguro(error);
    const rechazado = error instanceof FactpyApiError;
    await prisma.electronicDocument.update({
      where: { id: documento.id },
      data: { status: rechazado ? "RECHAZADO" : "PENDIENTE", ultimoError: mensaje, mensaje },
    });
    return {
      estado: rechazado ? "ERROR" : "PENDIENTE",
      documentId: documento.id,
      mensaje,
    };
  }
}

async function datosComunes() {
  const config = await prisma.storeConfig.findFirst();
  return {
    establecimiento: config?.establecimiento || "001",
    punto: config?.puntoExpedicion || "001",
    timbrado: config?.timbrado ?? null,
    contingencia: config?.factpyContingencia ?? false,
    plazoDias: config?.creditoPlazoDias ?? 30,
  };
}

/** Emite la factura de una venta. Las ventas TICKET no generan DE. */
export async function emitirFacturaDeVenta(saleId: string): Promise<ResultadoEmision> {
  if (!integracionActiva()) return { estado: "OMITIDO", mensaje: "FACTPY deshabilitado" };

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { customer: true, items: { include: { product: true } }, payments: true },
  });
  if (!sale) return { estado: "ERROR", mensaje: "Venta no encontrada" };
  if (sale.documentType !== "FACTURA" || !sale.customer) {
    return { estado: "OMITIDO", mensaje: "La venta no es factura" };
  }

  const comunes = await datosComunes();
  const esCredito = sale.paymentMethod === "CREDITO";
  const kind: ElectronicDocumentKind = esCredito ? "FACTURA_CREDITO_PLAZO" : "FACTURA_CONTADO";
  const numero = numeroDesdeFactura(sale.invoiceNumber) ?? (await siguienteNumero(kind, comunes.establecimiento, comunes.punto));
  const receiptid = generarReceiptid(esCredito ? "FACCR" : "FAC", sale.id);

  const payload = construirFactura({
    fecha: sale.createdAt,
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    receiptid,
    codigoSeguridad: generarCodigoSeguridad(),
    contingencia: comunes.contingencia,
    cliente: {
      ruc: sale.customer.document,
      nombre: sale.customer.name,
      direccion: sale.customer.address,
      correo: sale.customer.email,
      telefono: sale.customer.phone,
      cpais: sale.customer.cpais,
      numCasa: sale.customer.numCasa,
      documentType: sale.customer.documentType,
    },
    items: sale.items.map((item) => ({
      descripcion: item.product.name,
      codigo: item.product.code,
      cantidad: item.quantity,
      precioUnitario: item.unitPrice,
      total: item.total,
    })),
    pagos: sale.payments.map((pago) => ({ metodo: pago.method, monto: pago.amount })),
    total: sale.total,
    descripcion: sale.notes || undefined,
    esCredito,
    credito: esCredito ? { condicionCredito: 1, plazoDias: comunes.plazoDias } : undefined,
  });

  return registrarYEmitir({
    kind,
    receiptid,
    payload,
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    timbrado: comunes.timbrado,
    saleId: sale.id,
    customerId: sale.customerId,
  });
}

/** Emite un recibo por un abono de crédito. */
export async function emitirReciboDeAbono(paymentId: string): Promise<ResultadoEmision> {
  if (!integracionActiva()) return { estado: "OMITIDO", mensaje: "FACTPY deshabilitado" };

  const pago = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { sale: { include: { customer: true } } },
  });
  if (!pago || !pago.sale.customer) return { estado: "ERROR", mensaje: "Pago no encontrado" };

  const factura = await prisma.electronicDocument.findFirst({
    where: { saleId: pago.saleId, status: "APROBADO", kind: { in: ["FACTURA_CONTADO", "FACTURA_CREDITO_PLAZO", "FACTURA_CREDITO_CUOTAS"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!factura) {
    return { estado: "OMITIDO", mensaje: "No hay factura electrónica aprobada asociada al abono" };
  }

  const comunes = await datosComunes();
  const numero = await siguienteNumero("RECIBO", comunes.establecimiento, comunes.punto);
  const receiptid = generarReceiptid("REC", pago.id);
  const payload = construirRecibo({
    fecha: pago.createdAt,
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    receiptid,
    codigoSeguridad: generarCodigoSeguridad(),
    cliente: {
      ruc: pago.sale.customer.document,
      nombre: pago.sale.customer.name,
      correo: pago.sale.customer.email,
      direccion: pago.sale.customer.address,
      cpais: pago.sale.customer.cpais,
      numCasa: pago.sale.customer.numCasa,
      documentType: pago.sale.customer.documentType,
    },
    concepto: `Abono factura ${factura.documento || pago.sale.invoiceNumber || pago.sale.number}`,
    items: [
      {
        documento: factura.documento || pago.sale.invoiceNumber || pago.sale.number,
        importeDocumento: pago.sale.total,
        importePago: pago.amount,
        metodo: pago.method,
      },
    ],
  });

  return registrarYEmitir({
    kind: "RECIBO",
    receiptid,
    payload,
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    timbrado: comunes.timbrado,
    saleId: pago.saleId,
    paymentId: pago.id,
    customerId: pago.sale.customerId,
  });
}

/** Reenvía un documento pendiente o rechazado conservando su receiptid. */
export async function reenviarDocumento(documentId: string): Promise<ResultadoEmision> {
  if (!integracionActiva()) return { estado: "OMITIDO", mensaje: "FACTPY deshabilitado" };
  const documento = await prisma.electronicDocument.findUnique({ where: { id: documentId } });
  if (!documento) return { estado: "ERROR", mensaje: "Documento no encontrado" };
  if (documento.status === "APROBADO") return { estado: "APROBADO", documentId, mensaje: "Ya estaba aprobado" };

  await prisma.electronicDocument.update({
    where: { id: documentId },
    data: { intentos: { increment: 1 }, enviadoAt: new Date() },
  });
  try {
    const respuesta = await emitirDocumentoFactpy(documento.payload as FactpyDocumentPayload);
    await aplicarRespuesta(documentId, respuesta);
    return { estado: "APROBADO", documentId };
  } catch (error) {
    const mensaje = mensajeSeguro(error);
    const rechazado = error instanceof FactpyApiError;
    await prisma.electronicDocument.update({
      where: { id: documentId },
      data: { status: rechazado ? "RECHAZADO" : "PENDIENTE", ultimoError: mensaje, mensaje },
    });
    return { estado: rechazado ? "ERROR" : "PENDIENTE", documentId, mensaje };
  }
}

/** Consulta estados en FACTPY y actualiza los documentos pendientes. */
export async function sincronizarEstados(ids?: string[]): Promise<{ actualizados: number; mensaje?: string }> {
  if (!integracionActiva()) return { actualizados: 0, mensaje: "FACTPY deshabilitado" };

  const documentos = await prisma.electronicDocument.findMany({
    where: {
      status: { in: ["PENDIENTE", "RECHAZADO"] },
      ...(ids?.length ? { id: { in: ids } } : {}),
    },
    take: 100,
  });
  if (!documentos.length) return { actualizados: 0 };

  const estados = await consultarEstadosFactpy(documentos.map((doc) => doc.receiptid));
  const porReceiptid = new Map(estados.map((estado) => [estado.receiptid, estado]));
  let actualizados = 0;

  for (const doc of documentos) {
    const estado = porReceiptid.get(doc.receiptid);
    if (!estado) continue;
    const estadoNormalizado = (estado.estado || "").trim().toLowerCase();
    const status =
      estadoNormalizado === "aprobado"
        ? "APROBADO"
        : estadoNormalizado === "rechazado"
          ? "RECHAZADO"
          : "PENDIENTE";
    await prisma.electronicDocument.update({
      where: { id: doc.id },
      data: {
        status,
        cdc: estado.cdc && estado.cdc !== "N/A" ? estado.cdc : doc.cdc,
        documento: estado.documento && estado.documento !== "N/A" ? estado.documento : doc.documento,
        numeroTr: estado.numero_tr || doc.numeroTr,
        mensaje: estado.mensaje || null,
        ultimoError: status === "RECHAZADO" ? estado.mensaje || doc.ultimoError : null,
        aprobadoAt: status === "APROBADO" ? doc.aprobadoAt ?? new Date() : doc.aprobadoAt,
      },
    });
    actualizados += 1;
  }
  return { actualizados };
}

export interface DatosEvento {
  tipo: FactpyEventType;
  documentId?: string;
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

function construirPayloadEvento(datos: DatosEvento): FactpyEventPayload {
  if (datos.tipo === "CANCELACION") {
    if (!datos.cdc) throw new Error("La cancelación requiere el CDC del documento");
    return { tipoEvento: 2, cdc: datos.cdc, motivo: datos.motivo || "Anulación de documento" };
  }
  if (datos.tipo === "NOMINACION") {
    if (!datos.cdc || !datos.nombre || !datos.ruc) {
      throw new Error("La nominación requiere CDC, nombre y RUC");
    }
    return { tipoEvento: 3, cdc: datos.cdc, nombre: datos.nombre, ruc: datos.ruc, correo: datos.correo || "" };
  }
  if (!datos.timbrado || !datos.tipoDoc || !datos.establecimiento || !datos.punto || !datos.desde || !datos.hasta) {
    throw new Error("La inutilización requiere timbrado, tipo, establecimiento, punto y rango");
  }
  return {
    tipoEvento: 1,
    timbrado: datos.timbrado,
    tipoDoc: datos.tipoDoc,
    establecimiento: datos.establecimiento,
    punto: datos.punto,
    desde: datos.desde,
    hasta: datos.hasta,
    motivo: datos.motivo || "Salto de numeración",
  };
}

export async function crearEvento(datos: DatosEvento): Promise<{ id: string; estado: "ACEPTADO" | "RECHAZADO" | "PENDIENTE" | "OMITIDO"; mensaje?: string }> {
  const payload = construirPayloadEvento(datos);
  if (!integracionActiva()) {
    return { id: "", estado: "OMITIDO", mensaje: "FACTPY deshabilitado" };
  }

  const evento = await prisma.factpyEvent.create({
    data: {
      tipo: datos.tipo,
      status: "PENDIENTE",
      documentId: datos.documentId,
      cdc: datos.cdc,
      tipoDoc: datos.tipoDoc,
      timbrado: datos.timbrado,
      establecimiento: datos.establecimiento,
      punto: datos.punto,
      desde: datos.desde,
      hasta: datos.hasta,
      motivo: datos.motivo || "",
      nombre: datos.nombre,
      ruc: datos.ruc,
      correo: datos.correo,
      intentos: 1,
    },
  });

  try {
    const respuesta = await enviarEventoFactpy(payload);
    await prisma.factpyEvent.update({
      where: { id: evento.id },
      data: { status: "ACEPTADO", code: respuesta.code, fechaRespuesta: respuesta.fecha, ultimoError: null },
    });
    if (datos.documentId && datos.tipo === "CANCELACION") {
      await prisma.electronicDocument.update({
        where: { id: datos.documentId },
        data: { status: "ANULADO" },
      });
    }
    return { id: evento.id, estado: "ACEPTADO", mensaje: respuesta.code };
  } catch (error) {
    const mensaje = mensajeSeguro(error);
    const rechazado = error instanceof FactpyApiError;
    await prisma.factpyEvent.update({
      where: { id: evento.id },
      data: { status: rechazado ? "RECHAZADO" : "PENDIENTE", ultimoError: mensaje },
    });
    return { id: evento.id, estado: rechazado ? "RECHAZADO" : "PENDIENTE", mensaje };
  }
}

/** Al anular una venta: cancela si aún está en 48 h, si no emite nota de crédito. */
export async function procesarAnulacionVenta(saleId: string, motivo: string): Promise<ResultadoEmision> {
  if (!integracionActiva()) return { estado: "OMITIDO", mensaje: "FACTPY deshabilitado" };

  const documento = await prisma.electronicDocument.findFirst({
    where: { saleId, status: "APROBADO", cdc: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!documento?.cdc) return { estado: "OMITIDO", mensaje: "La venta no tiene documento aprobado" };

  const dentroDe48h = documento.aprobadoAt
    ? Date.now() - documento.aprobadoAt.getTime() < 48 * 60 * 60 * 1000
    : false;
  if (dentroDe48h) {
    const evento = await crearEvento({
      tipo: "CANCELACION",
      documentId: documento.id,
      cdc: documento.cdc,
      motivo,
    });
    return {
      estado: evento.estado === "ACEPTADO" ? "APROBADO" : evento.estado === "OMITIDO" ? "OMITIDO" : "ERROR",
      documentId: documento.id,
      mensaje: evento.mensaje,
    };
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!sale?.customer) return { estado: "ERROR", mensaje: "No se pudo armar la nota de crédito" };

  const comunes = await datosComunes();
  const numero = await siguienteNumero("NOTA_CREDITO", comunes.establecimiento, comunes.punto);
  const receiptid = generarReceiptid("NTC", sale.id);
  const payload = construirNotaCredito({
    fecha: new Date(),
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    receiptid,
    codigoSeguridad: generarCodigoSeguridad(),
    contingencia: comunes.contingencia,
    cliente: {
      ruc: sale.customer.document,
      nombre: sale.customer.name,
      direccion: sale.customer.address,
      correo: sale.customer.email,
      cpais: sale.customer.cpais,
      numCasa: sale.customer.numCasa,
      documentType: sale.customer.documentType,
    },
    items: sale.items.map((item) => ({
      descripcion: item.product.name,
      codigo: item.product.code,
      cantidad: item.quantity,
      precioUnitario: item.unitPrice,
      total: item.total,
    })),
    pagos: [],
    total: sale.total,
    cdcAsociado: documento.cdc,
    motivo,
  });

  return registrarYEmitir({
    kind: "NOTA_CREDITO",
    receiptid,
    payload,
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    timbrado: comunes.timbrado,
    saleId: sale.id,
    customerId: sale.customerId,
  });
}

export interface DatosDocumentoManual {
  tipo: "AUTOFACTURA" | "NOTA_REMISION" | "ANTICIPO" | "FACTURA_EXPORTACION";
  cliente: {
    ruc?: string | null;
    nombre: string;
    direccion?: string | null;
    correo?: string | null;
    telefono?: string | null;
    cpais?: string | null;
    numCasa?: number | null;
    documentType?: string | null;
  };
  items: Array<{
    descripcion: string;
    codigo?: string | null;
    cantidad: number;
    precioUnitario: number;
    total: number;
    exento?: boolean;
  }>;
  total: number;
  descripcion?: string;
  campos?: Record<string, unknown>;
}

/** Emisión manual de documentos adicionales (autofactura, remisión, anticipo, exportación). */
export async function emitirDocumentoManual(datos: DatosDocumentoManual): Promise<ResultadoEmision> {
  if (!integracionActiva()) return { estado: "OMITIDO", mensaje: "FACTPY deshabilitado" };
  if (!datos.items.length) return { estado: "ERROR", mensaje: "Debe cargar al menos un ítem" };

  const comunes = await datosComunes();
  const config = await prisma.storeConfig.findFirst();
  const numero = await siguienteNumero(datos.tipo, comunes.establecimiento, comunes.punto);
  const receiptid = generarReceiptid(datos.tipo.slice(0, 5).toUpperCase(), `M${Date.now()}`);
  const esAutofactura = datos.tipo === "AUTOFACTURA";
  const campos = datos.campos ?? {};

  const payloadBase = construirFactura({
    fecha: new Date(),
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    receiptid,
    codigoSeguridad: generarCodigoSeguridad(),
    contingencia: comunes.contingencia,
    cliente: esAutofactura
      ? {
          ruc: config?.ruc,
          nombre: config?.name || "EMISOR",
          direccion: config?.address,
          cpais: "PRY",
        }
      : datos.cliente,
    items: datos.items,
    pagos: [{ metodo: "EFECTIVO", monto: datos.total }],
    total: datos.total,
    descripcion: datos.descripcion,
    esAnticipo: datos.tipo === "ANTICIPO",
  });

  let payload: FactpyDocumentPayload = payloadBase;
  if (datos.tipo === "AUTOFACTURA") {
    payload = {
      ...payloadBase,
      tipoDocumento: 4,
      autofactura: campos.autofactura ?? {},
      items: payloadBase.items.map((item) => ({ ...item, ivaTasa: 0, ivaAfecta: 3, baseGravItem: 0, liqIvaItem: 0 })),
    };
  } else if (datos.tipo === "NOTA_REMISION") {
    payload = {
      ...payloadBase,
      tipoDocumento: 7,
      cliente: { ...payloadBase.cliente, ...(campos.cliente as object | undefined) },
      transporte: Array.isArray(campos.transporte) ? campos.transporte : [],
    };
  } else if (datos.tipo === "FACTURA_EXPORTACION") {
    payload = { ...payloadBase, esExportacion: 1, exportacion: campos.exportacion ?? {} };
  } else {
    payload = { ...payloadBase, totalGs: datos.total };
  }

  return registrarYEmitir({
    kind: datos.tipo,
    receiptid,
    payload,
    establecimiento: comunes.establecimiento,
    punto: comunes.punto,
    numero,
    timbrado: comunes.timbrado,
  });
}

export async function descargarArchivo(documentoId: string, tipo: "kude" | "xml") {
  if (!integracionActiva()) throw new Error("FACTPY deshabilitado");
  const documento = await prisma.electronicDocument.findUnique({ where: { id: documentoId } });
  if (!documento) throw new Error("Documento no encontrado");
  const url = tipo === "kude" ? documento.kude : documento.xmlLink;
  if (!url) throw new Error(`El documento no tiene ${tipo === "kude" ? "KUDE" : "XML"}`);
  return descargarArchivoFactpy(url);
}
