import { describe, expect, it } from "vitest";
import { generarCodigoSeguridad, generarReceiptid, numeroDesdeFactura, padCodigo, padNumero } from "../security";

describe("seguridad FACTPY", () => {
  it("genera un código de 9 dígitos", () => {
    const codigo = generarCodigoSeguridad();
    expect(codigo).toMatch(/^\d{9}$/);
  });

  it("genera receiptid únicos y con prefijo", () => {
    const a = generarReceiptid("factura", "abc-123");
    const b = generarReceiptid("factura", "abc-123");
    expect(a).toMatch(/^FAC/);
    expect(a).not.toBe(b);
  });

  it("extrae el número de invoiceNumber", () => {
    expect(numeroDesdeFactura("001-001-0000042")).toBe("0000042");
    expect(numeroDesdeFactura("sin numero")).toBeNull();
    expect(numeroDesdeFactura(null)).toBeNull();
  });

  it("rellena códigos y números", () => {
    expect(padCodigo("1")).toBe("001");
    expect(padNumero(42)).toBe("0000042");
    expect(() => padNumero(0)).toThrow("Número de documento fuera de rango");
    expect(() => padCodigo("abc")).toThrow("Establecimiento y punto deben tener entre 1 y 3 dígitos");
  });
});
