import type { NextRequest } from "next/server";

/**
 * Limitador de intentos en memoria, pensado para una sola instancia (demo).
 * En Render con múltiples réplicas habría que usar un store compartido o el
 * rate limiting del proveedor. Ver docs de Next.js: backend-for-frontend.
 */

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

type RateLimitStore = Map<string, Bucket>;

const globalWithStore = globalThis as typeof globalThis & {
  __boutiqueRateLimitStore?: RateLimitStore;
};

const store: RateLimitStore =
  globalWithStore.__boutiqueRateLimitStore ?? new Map<string, Bucket>();

globalWithStore.__boutiqueRateLimitStore = store;

function cleanExpired(now: number) {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

function getBucket(key: string, now: number, windowMs: number): Bucket {
  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + windowMs };
    store.set(key, fresh);
    return fresh;
  }
  return existing;
}

function buildResult(bucket: Bucket, options: RateLimitOptions, now: number): RateLimitResult {
  const allowed = bucket.count < options.limit;
  return {
    allowed,
    remaining: Math.max(0, options.limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    resetAt: bucket.resetAt,
  };
}

/** Consulta el estado sin incrementar el contador. */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  cleanExpired(now);
  return buildResult(getBucket(key, now, options.windowMs), options, now);
}

/** Registra un intento fallido y devuelve el estado resultante. */
export function recordRateLimitFailure(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  cleanExpired(now);
  const bucket = getBucket(key, now, options.windowMs);
  bucket.count += 1;
  return buildResult(bucket, options, now);
}

/** Limpia el contador luego de un login exitoso. */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "desconocida";
  return req.headers.get("x-real-ip")?.trim() || "desconocida";
}
