import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session-token";

const originalSessionSecret = process.env.SESSION_SECRET;

afterEach(() => {
  if (originalSessionSecret === undefined) {
    delete process.env.SESSION_SECRET;
  } else {
    process.env.SESSION_SECRET = originalSessionSecret;
  }
});

describe("autenticación", () => {
  it("verifica hashes de contraseña y rechaza contraseñas incorrectas", async () => {
    const hash = await hashPassword("una-clave-segura");
    expect(hash).not.toContain("una-clave-segura");
    await expect(verifyPassword("una-clave-segura", hash)).resolves.toEqual({
      valid: true,
      needsRehash: false,
    });
    await expect(verifyPassword("otra-clave", hash)).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it("permite migrar contraseñas heredadas en texto plano al iniciar sesión", async () => {
    await expect(verifyPassword("clave-antigua", "clave-antigua")).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
    await expect(verifyPassword("incorrecta", "clave-antigua")).resolves.toEqual({
      valid: false,
      needsRehash: true,
    });
  });

  it("firma sesiones y rechaza tokens alterados o ausentes", async () => {
    process.env.SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
    const token = await createSessionToken("usuario-123");

    await expect(verifySessionToken(token)).resolves.toBe("usuario-123");
    await expect(verifySessionToken(`${token}x`)).resolves.toBeNull();
    await expect(verifySessionToken(undefined)).resolves.toBeNull();
  });
});
