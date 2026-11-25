import { describe, expect, it } from "vitest";
import {
  calcularEstadoVenta,
  calcularNuevoEstadoDespuesAbono,
  calcularSaldo,
  validarAbono,
} from "../credit-utils";

describe("credit-utils", () => {
  describe("calcularSaldo", () => {
    it("calcula saldo = total - paidAmount", () => {
      expect(calcularSaldo(100000, 30000)).toBe(70000);
      expect(calcularSaldo(50000, 0)).toBe(50000);
      expect(calcularSaldo(75000, 75000)).toBe(0);
    });
  });

  describe("calcularEstadoVenta", () => {
    it("cuando paidAmount >= total retorna PAGADA", () => {
      expect(calcularEstadoVenta(100000, 100000)).toBe("PAGADA");
      expect(calcularEstadoVenta(100000, 150000)).toBe("PAGADA");
    });

    it("cuando paidAmount < total retorna PENDIENTE", () => {
      expect(calcularEstadoVenta(100000, 0)).toBe("PENDIENTE");
      expect(calcularEstadoVenta(100000, 50000)).toBe("PENDIENTE");
      expect(calcularEstadoVenta(100000, 99999)).toBe("PENDIENTE");
    });
  });

  describe("validarAbono", () => {
    it("rechaza abono no mayor a 0", () => {
      const res1 = validarAbono(100000, 0, 0);
      expect(res1.valido).toBe(false);
      expect(res1.saldoPendiente).toBe(100000);

      const res2 = validarAbono(100000, 20000, -5000);
      expect(res2.valido).toBe(false);
    });

    it("rechaza abono mayor a saldo pendiente", () => {
      const res = validarAbono(100000, 30000, 80000);
      expect(res.valido).toBe(false);
      expect(res.saldoPendiente).toBe(70000);
    });

    it("acepta abono menor o igual al saldo pendiente", () => {
      const res1 = validarAbono(100000, 30000, 70000);
      expect(res1.valido).toBe(true);

      const res2 = validarAbono(100000, 0, 25000);
      expect(res2.valido).toBe(true);
    });
  });

  describe("calcularNuevoEstadoDespuesAbono", () => {
    it("al abonar queda en PENDIENTE si aún falta saldo", () => {
      const res = calcularNuevoEstadoDespuesAbono(100000, 30000, 20000);
      expect(res.nuevoPaidAmount).toBe(50000);
      expect(res.nuevoEstado).toBe("PENDIENTE");
      expect(res.saldoPendiente).toBe(70000);
    });

    it("al abonar queda en PAGADA si cubre o supera el total", () => {
      const res1 = calcularNuevoEstadoDespuesAbono(100000, 30000, 70000);
      expect(res1.nuevoPaidAmount).toBe(100000);
      expect(res1.nuevoEstado).toBe("PAGADA");

      const res2 = calcularNuevoEstadoDespuesAbono(100000, 80000, 30000);
      expect(res2.nuevoPaidAmount).toBe(110000);
      expect(res2.nuevoEstado).toBe("PAGADA");
    });
  });
});
