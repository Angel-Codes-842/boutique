import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clearRateLimit, recordRateLimitFailure } from "@/lib/rate-limit";

const KEY = "test:rate-limit";
const OPTIONS = { limit: 2, windowMs: 1000 };

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    clearRateLimit(KEY);
  });

  afterEach(() => {
    clearRateLimit(KEY);
    vi.useRealTimers();
  });

  it("permite intentos hasta el límite y luego bloquea", () => {
    expect(checkRateLimit(KEY, OPTIONS).allowed).toBe(true);
    expect(recordRateLimitFailure(KEY, OPTIONS).allowed).toBe(true);
    expect(recordRateLimitFailure(KEY, OPTIONS).allowed).toBe(false);
    expect(checkRateLimit(KEY, OPTIONS).allowed).toBe(false);
  });

  it("devuelve Retry-After positivo cuando bloquea", () => {
    recordRateLimitFailure(KEY, OPTIONS);
    const result = recordRateLimitFailure(KEY, OPTIONS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("reinicia el contador después de la ventana", () => {
    recordRateLimitFailure(KEY, OPTIONS);
    recordRateLimitFailure(KEY, OPTIONS);
    expect(checkRateLimit(KEY, OPTIONS).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-01-01T00:00:01.001Z"));
    expect(checkRateLimit(KEY, OPTIONS).allowed).toBe(true);
    expect(checkRateLimit(KEY, OPTIONS).remaining).toBe(OPTIONS.limit);
  });

  it("limpia el contador al iniciar sesión correctamente", () => {
    recordRateLimitFailure(KEY, OPTIONS);
    clearRateLimit(KEY);
    expect(checkRateLimit(KEY, OPTIONS).allowed).toBe(true);
  });
});
