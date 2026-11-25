import { describe, expect, it } from "vitest";
import {
  calcularStockTotalPorVariantes,
  cantidadParaMovimiento,
  validarStockSuficiente,
} from "../stock-utils";

describe("stock-utils", () => {
  describe("validarStockSuficiente", () => {
    it("valida stock suficiente sin variantes", () => {
      const res = validarStockSuficiente({
        producto: { stock: 100 },
        cantidadSolicitada: 50,
      });
      expect(res.suficiente).toBe(true);
      expect(res.stockDisponible).toBe(100);
    });

    it("valida stock insuficiente sin variantes", () => {
      const res = validarStockSuficiente({
        producto: { stock: 30 },
        cantidadSolicitada: 50,
      });
      expect(res.suficiente).toBe(false);
      expect(res.stockDisponible).toBe(30);
      expect(res.faltante).toBe(20);
    });

    it("valida stock suficiente con variantes (suma total)", () => {
      const res = validarStockSuficiente({
        producto: { variants: [{ stock: 20 }, { stock: 15 }, { stock: 10 }] },
        cantidadSolicitada: 40,
        tieneVariantes: true,
      });
      expect(res.suficiente).toBe(true);
      expect(res.stockDisponible).toBe(45);
    });

    it("valida stock insuficiente con variantes", () => {
      const res = validarStockSuficiente({
        producto: { variants: [{ stock: 10 }, { stock: 5 }] },
        cantidadSolicitada: 20,
        tieneVariantes: true,
      });
      expect(res.suficiente).toBe(false);
      expect(res.faltante).toBe(5);
    });

    it("acepta stockDisponible directo", () => {
      const res = validarStockSuficiente({
        stockDisponible: 100,
        cantidadSolicitada: 100,
      });
      expect(res.suficiente).toBe(true);
    });
  });

  describe("calcularStockTotalPorVariantes", () => {
    it("calcula stock total sumando variantes", () => {
      const total = calcularStockTotalPorVariantes([
        { stock: 5 },
        { stock: 10 },
        { stock: 3 },
      ]);
      expect(total).toBe(18);
    });

    it("retorna 0 si no hay variantes", () => {
      expect(calcularStockTotalPorVariantes([])).toBe(0);
      expect(calcularStockTotalPorVariantes(undefined as any)).toBe(0);
    });
  });

  describe("cantidadParaMovimiento", () => {
    it("VENTA debe ser negativo", () => {
      expect(cantidadParaMovimiento("VENTA", 5)).toBe(-5);
      expect(cantidadParaMovimiento("VENTA", 10)).toBe(-10);
    });

    it("ENTRADA debe ser positivo", () => {
      expect(cantidadParaMovimiento("ENTRADA", 5)).toBe(5);
      expect(cantidadParaMovimiento("ENTRADA", 20)).toBe(20);
    });

    it("SALIDA debe ser negativo", () => {
      expect(cantidadParaMovimiento("SALIDA", 3)).toBe(-3);
    });
  });
});
