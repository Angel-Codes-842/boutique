import { describe, expect, it } from "vitest";
import {
  calcularDiferenciaAlCerrar,
  calcularEgresos,
  calcularIngresos,
  calcularSaldoEsperado,
  calcularTotalVentas,
} from "../caja-utils";

describe("caja-utils", () => {
  describe("calcularTotalVentas", () => {
    it("calcula total de ventas desde array de objetos", () => {
      const ventas = [{ total: 100000 }, { total: 50000 }, { total: 25000 }];
      expect(calcularTotalVentas(ventas)).toBe(175000);
    });

    it("calcula total desde array de números", () => {
      const ventas = [100000, 50000, 25000];
      expect(calcularTotalVentas(ventas)).toBe(175000);
    });

    it("retorna 0 si array vacío", () => {
      expect(calcularTotalVentas([])).toBe(0);
    });
  });

  describe("calcularIngresos", () => {
    it("suma solo movimientos tipo INGRESO", () => {
      const movimientos = [
        { type: "INGRESO", amount: 20000 },
        { type: "EGRESO", amount: 10000 },
        { type: "INGRESO", amount: 5000 },
      ];
      expect(calcularIngresos(movimientos)).toBe(25000);
    });

    it("retorna 0 si no hay ingresos", () => {
      const movimientos = [{ type: "EGRESO", amount: 10000 }];
      expect(calcularIngresos(movimientos)).toBe(0);
    });
  });

  describe("calcularEgresos", () => {
    it("suma solo movimientos tipo EGRESO", () => {
      const movimientos = [
        { type: "INGRESO", amount: 20000 },
        { type: "EGRESO", amount: 15000 },
        { type: "EGRESO", amount: 5000 },
      ];
      expect(calcularEgresos(movimientos)).toBe(20000);
    });
  });

  describe("calcularSaldoEsperado", () => {
    it("calcula saldo esperado = apertura + ventas + ingresos - egresos", () => {
      const saldo = calcularSaldoEsperado({
        apertura: 100000,
        ventas: [{ total: 200000 }],
        ingresos: [{ type: "INGRESO", amount: 30000 }],
        egresos: [{ type: "EGRESO", amount: 20000 }],
      });
      expect(saldo).toBe(310000);
    });

    it("funciona con valores numéricos directos", () => {
      const saldo = calcularSaldoEsperado({
        apertura: 50000,
        ventas: 150000,
        ingresos: 10000,
        egresos: 5000,
      });
      expect(saldo).toBe(205000);
    });
  });

  describe("calcularDiferenciaAlCerrar", () => {
    it("calcula diferencia = monto contado - saldo esperado", () => {
      expect(calcularDiferenciaAlCerrar(310000, 310000)).toBe(0);
      expect(calcularDiferenciaAlCerrar(315000, 310000)).toBe(5000);
      expect(calcularDiferenciaAlCerrar(305000, 310000)).toBe(-5000);
    });
  });
});
