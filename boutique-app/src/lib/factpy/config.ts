/**
 * Configuración de FACTPY (facturación electrónica Paraguay / SIFEN).
 *
 * IMPORTANTE: esto es solo scaffolding. La integración NO está activa.
 * El recordID es un secreto de servidor: nunca debe exponerse al cliente.
 */

export type FactpyEnvironment = "test" | "production";

export interface FactpyRuntimeConfig {
  enabled: boolean;
  apiUrl: string;
  recordId: string | null;
  environment: FactpyEnvironment;
  timeoutMs: number;
  isConfigured: boolean;
}

export function getFactpyConfig(): FactpyRuntimeConfig {
  const enabled = process.env.FACTPY_ENABLED === "true";
  const apiUrl = process.env.FACTPY_API_URL?.trim() || "https://api.factpy.com";
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
    available: false,
  };
}
