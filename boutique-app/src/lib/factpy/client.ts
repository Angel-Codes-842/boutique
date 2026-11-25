/**
 * Cliente HTTP de FACTPY. Todas las credenciales viajan solo desde el servidor.
 * Nunca se exponen en respuestas ni en logs.
 */

import { esUrlFactpySegura, getFactpyConfig, normalizarUrlFactpy } from "./config";
import type {
  FactpyDocumentPayload,
  FactpyEstadoItem,
  FactpyEventPayload,
  FactpyResponse,
  FactpySuccessResponse,
} from "./types";

export class FactpyDisabledError extends Error {
  constructor() {
    super("La integración FACTPY está deshabilitada (FACTPY_ENABLED=false)");
    this.name = "FactpyDisabledError";
  }
}

export class FactpyNotConfiguredError extends Error {
  constructor() {
    super("FACTPY está habilitado pero falta FACTPY_RECORD_ID");
    this.name = "FactpyNotConfiguredError";
  }
}

export class FactpyHttpError extends Error {
  constructor(public readonly status: number) {
    super(`FACTPY devolvió HTTP ${status}`);
    this.name = "FactpyHttpError";
  }
}

export class FactpyResponseError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "FactpyResponseError";
  }
}

/** FACTPY respondió `status:false`: el documento fue rechazado, no es un fallo de red. */
export class FactpyApiError extends FactpyResponseError {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "FactpyApiError";
  }
}

function validarCredenciales() {
  const config = getFactpyConfig();
  if (!config.enabled) throw new FactpyDisabledError();
  if (!config.isConfigured || !config.recordId) throw new FactpyNotConfiguredError();
  return config;
}

async function postForm(url: string, campos: Record<string, string>): Promise<unknown> {
  const config = getFactpyConfig();
  const form = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    form.append(clave, valor);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      body: form,
      cache: "no-store",
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (error) {
    const causa = error instanceof Error ? error.message : "error desconocido";
    throw new FactpyResponseError(`No se pudo conectar con FACTPY: ${causa}`);
  }

  if (!response.ok) throw new FactpyHttpError(response.status);

  const texto = await response.text();
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    throw new FactpyResponseError("FACTPY devolvió una respuesta que no es JSON válido");
  }
}

export async function emitirDocumentoFactpy(payload: FactpyDocumentPayload): Promise<FactpySuccessResponse> {
  const config = validarCredenciales();
  const respuesta = (await postForm(config.endpoints.documentos, {
    dataJson: JSON.stringify(payload),
    recordID: config.recordId!,
  })) as FactpyResponse;

  if (!respuesta || typeof respuesta !== "object" || !("status" in respuesta)) {
    throw new FactpyResponseError("Respuesta inesperada de FACTPY");
  }
  if (!respuesta.status) {
    throw new FactpyApiError((respuesta as { code?: string }).code || "FACTPY rechazó el documento");
  }
  return respuesta as FactpySuccessResponse;
}

export async function enviarEventoFactpy(payload: FactpyEventPayload): Promise<{ code: string; fecha: string }> {
  const config = validarCredenciales();
  const respuesta = (await postForm(config.endpoints.eventos, {
    dataJson: JSON.stringify(payload),
    recordID: config.recordId!,
  })) as FactpyResponse;

  if (!respuesta || typeof respuesta !== "object" || !("status" in respuesta)) {
    throw new FactpyResponseError("Respuesta inesperada de FACTPY al registrar el evento");
  }
  if (!respuesta.status) {
    throw new FactpyApiError((respuesta as { code?: string }).code || "FACTPY rechazó el evento");
  }
  const fecha = "fecha" in respuesta && typeof respuesta.fecha === "string" ? respuesta.fecha : "";
  return { code: (respuesta as { code?: string }).code || "Evento registrado", fecha };
}

export async function consultarEstadosFactpy(receiptIds: string[]): Promise<FactpyEstadoItem[]> {
  if (!receiptIds.length) return [];
  const config = validarCredenciales();
  const respuesta = await postForm(config.endpoints.estados, {
    receiptid: JSON.stringify({ receiptid: receiptIds }),
    recordID: config.recordId!,
  });

  if (Array.isArray(respuesta)) return respuesta as FactpyEstadoItem[];
  if (respuesta && typeof respuesta === "object" && Array.isArray((respuesta as { data?: unknown }).data)) {
    return (respuesta as { data: FactpyEstadoItem[] }).data;
  }
  throw new FactpyResponseError("Respuesta inesperada al consultar estados");
}

/** Descarga KUDE/XML desde FACTPY sin salir de nuestra app (evita exponer secretos). */
export async function descargarArchivoFactpy(url: string): Promise<{ body: ArrayBuffer; contentType: string }> {
  validarCredenciales();
  if (!esUrlFactpySegura(url)) {
    throw new FactpyResponseError("URL no permitida");
  }

  const response = await fetch(normalizarUrlFactpy(url), {
    cache: "no-store",
    signal: AbortSignal.timeout(getFactpyConfig().timeoutMs),
  });
  if (!response.ok) throw new FactpyHttpError(response.status);
  return {
    body: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}
