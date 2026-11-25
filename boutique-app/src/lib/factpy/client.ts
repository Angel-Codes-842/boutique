import { getFactpyConfig } from "./config";
import type { FactpyFacturaContadoPayload, FactpySuccessResponse } from "./types";

/**
 * Cliente FACTPY — SOLO SCAFFOLDING.
 *
 * Esta función NO realiza ninguna llamada de red todavía. Cuando se active,
 * el envío será POST multipart/form-data a FACTPY_API_URL con:
 *   - dataJson: JSON.stringify(payload)
 *   - recordID: config.recordId
 * Ver docs/FACTPY.md.
 */

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

export class FactpyNotImplementedError extends Error {
  constructor() {
    super("El envío a FACTPY aún no está implementado. Ver docs/FACTPY.md");
    this.name = "FactpyNotImplementedError";
  }
}

export async function emitirFacturaFactpy(
  _payload: FactpyFacturaContadoPayload,
): Promise<FactpySuccessResponse> {
  void _payload; // el parámetro se usará cuando se implemente el mapper completo.
  const config = getFactpyConfig();

  if (!config.enabled) throw new FactpyDisabledError();
  if (!config.isConfigured) throw new FactpyNotConfiguredError();

  // Punto de extensión futuro: aquí se armará el FormData y se hará el POST
  // con AbortSignal.timeout(config.timeoutMs) y parseo de FactpyResponse.
  throw new FactpyNotImplementedError();
}
