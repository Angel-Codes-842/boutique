/**
 * Configuración de FACTPY (facturación electrónica Paraguay / SIFEN).
 *
 * El recordID es un secreto de servidor: nunca debe exponerse al cliente.
 * La integración permanece desactivada hasta que FACTPY_ENABLED=true.
 */

export type FactpyEnvironment = "test" | "production";

export interface FactpyRuntimeConfig {
  enabled: boolean;
  apiUrl: string;
  recordId: string | null;
  environment: FactpyEnvironment;
  timeoutMs: number;
  isConfigured: boolean;
  endpoints: {
    documentos: string;
    eventos: string;
    estados: string;
  };
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getFactpyConfig(): FactpyRuntimeConfig {
  const enabled = process.env.FACTPY_ENABLED === "true";
  const apiUrl = normalizeBaseUrl(process.env.FACTPY_API_URL || "https://api.factpy.com");
  const recordId = process.env.FACTPY_RECORD_ID?.trim() || null;
  const environment: FactpyEnvironment =
    process.env.FACTPY_ENVIRONMENT === "production" ? "production" : "test";
  const parsedTimeout = Number.parseInt(process.env.FACTPY_TIMEOUT_MS ?? "10000", 10);
  const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 10000;

  return {
    enabled,
    apiUrl,
    recordId,
    environment,
    timeoutMs,
    isConfigured: Boolean(recordId),
    endpoints: {
      documentos: `${apiUrl}/facturacion-api/data.php`,
      eventos: `${apiUrl}/facturacion-api/evento.php`,
      estados: `${apiUrl}/facturacion-api/estadoDE.php`,
    },
  };
}

/** Datos seguros para mostrar en la UI. Nunca incluir recordID. */
export function getFactpyPublicStatus() {
  const config = getFactpyConfig();
  return {
    enabled: config.enabled,
    configured: config.isConfigured,
    environment: config.environment,
    apiUrl: config.apiUrl,
    available: config.enabled && config.isConfigured,
  };
}

/** FACTPY devuelve links sin esquema (`api.factpy.com/...`). */
export function normalizarUrlFactpy(url: string): string {
  const valor = url.trim();
  if (!valor) return valor;
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
}

/** Solo se permiten descargas de URLs del host configurado de FACTPY. */
export function esUrlFactpySegura(url: string): boolean {
  const config = getFactpyConfig();
  try {
    const target = new URL(normalizarUrlFactpy(url));
    const base = new URL(config.apiUrl);
    return target.protocol === "https:" && target.hostname === base.hostname;
  } catch {
    return false;
  }
}
