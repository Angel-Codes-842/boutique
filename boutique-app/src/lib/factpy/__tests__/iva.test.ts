import { describe, expect, it } from "vitest";
import { desglosarIva, precision8 } from "../iva";

describe("desglosarIva", () => {
  it("desglosa el IVA 10% incluido con precisión", () => {
    expect(desglosarIva(110_000)).toEqual({
      baseGravItem: 100_000,
      liqIvaItem: 10_000,
    });
  });

  it("conserva 8 decimales cuando el total no es divisible", () => {
    const { baseGravItem, liqIvaItem } = desglosarIva(1_001);
    expect(baseGravItem).toBe(910);
    expect(liqIvaItem).toBeCloseTo(91, 8);
    expect(baseGravItem + liqIvaItem).toBeCloseTo(1_001, 8);
  });

  it("redondea a 8 decimales", () => {
    expect(precision8(1.123456789)).toBe(1.12345679);
  });

  it("rechaza valores negativos o inválidos", () => {
    expect(() => desglosarIva(-1)).toThrow("El total debe ser un número no negativo");
    expect(() => desglosarIva(Number.NaN)).toThrow("El total debe ser un número no negativo");
  });
});
