import { describe, expect, it } from "vitest";
import { construirFactura, construirNotaCredito, construirRecibo } from "../mapper";

const base = {
  fecha: new Date("2026-11-25T10:30:00"),
  establecimiento: "1",
  punto: "2",
  numero: "0000042",
  receiptid: "FAC-test-123",
  codigoSeguridad: "123456789",
  cliente: { ruc: "80012345-6", nombre: "Cliente Prueba" },
  items: [
    {
      descripcion: "Vestido",
      codigo: "VES-1",
      cantidad: 1,
      precioUnitario: 110_000,
      total: 110_000,
    },
  ],
  pagos: [{ metodo: "EFECTIVO" as const, monto: 110_000 }],
  total: 110_000,
};

describe("mapper FACTPY", () => {
  it("construye una factura de contado con IVA desglosado", () => {
    const payload = construirFactura(base);

    expect(payload.tipoDocumento).toBe(1);
    expect(payload.condicionPago).toBe(1);
    expect(payload.moneda).toBe("PYG");
    expect(payload.establecimiento).toBe("001");
    expect(payload.punto).toBe("002");
    expect(payload.fecha).toBe("2026-11-25 10:30:00");
    expect(payload.cliente.ruc).toBe("80012345-6");
    expect(payload.items[0]).toMatchObject({
      ivaTasa: 10,
      ivaAfecta: 1,
      baseGravItem: 100_000,
      liqIvaItem: 10_000,
    });
    expect(payload.pagos).toEqual([{ tipoPago: "1", monto: 110_000 }]);
    expect(payload.totalPago).toBe(110_000);
    expect(payload.credito).toBeUndefined();
  });

  it("construye factura a crédito con cuotas", () => {
    const payload = construirFactura({
      ...base,
      esCredito: true,
      credito: {
        condicionCredito: 2,
        cantidadCuota: 2,
        cuotas: [
          { numero: 1, monto: 55_000, fechaVencimiento: "2026-12-25" },
          { numero: 2, monto: 55_000, fechaVencimiento: "2027-01-25" },
        ],
      },
    });

    expect(payload.condicionPago).toBe(2);
    expect(payload.pagos).toEqual([{}]);
    expect(payload.credito).toEqual({
      condicionCredito: 2,
      cantidadCuota: 2,
      cuotas: [
        { numero: 1, monto: 55_000, fechaVencimiento: "2026-12-25" },
        { numero: 2, monto: 55_000, fechaVencimiento: "2027-01-25" },
      ],
    });
  });

  it("marca exportación cuando se pasan campos de exportación", () => {
    const payload = construirFactura({
      ...base,
      exportacion: { codigoDestino: "USA" },
    });
    expect(payload.esExportacion).toBe(1);
    expect(payload.exportacion).toEqual({ codigoDestino: "USA" });
  });

  it("construye nota de crédito con montos negativos y CDC asociado", () => {
    const payload = construirNotaCredito({
      ...base,
      cdcAsociado: "ABC123",
      motivo: "Devolución",
    });

    expect(payload.tipoDocumento).toBe(5);
    expect(payload.descripcion).toBe("Devolución");
    expect(payload.totalPago).toBe(-110_000);
    expect(payload.items[0]).toMatchObject({
      cantidad: -1,
      precioTotal: -110_000,
      baseGravItem: -100_000,
      liqIvaItem: -10_000,
    });
    expect(payload.pagos).toEqual([{ tipoPago: "1", monto: -110_000 }]);
    expect(payload.documentoAsociado).toMatchObject({
      cdcAsociado: "ABC123",
      remision: false,
    });
  });

  it("construye recibo de abono", () => {
    const payload = construirRecibo({
      ...base,
      concepto: "Abono factura 001-002-0000042",
      items: [
        {
          documento: "001-002-0000042",
          importeDocumento: 110_000,
          importePago: 50_000,
          metodo: "EFECTIVO",
        },
      ],
    });

    expect(payload.tipoDocumento).toBe(0);
    expect(payload.items[0]).toMatchObject({
      documento: "001-002-0000042",
      importeDocumento: 110_000,
      importePago: 50_000,
      metodoPago: 1,
    });
  });

  it("rechaza documentos sin ítems", () => {
    expect(() => construirFactura({ ...base, items: [] })).toThrow(
      "La factura debe tener al menos un ítem",
    );
    expect(() => construirRecibo({ ...base, concepto: "x", items: [] })).toThrow(
      "El recibo debe tener al menos un documento",
    );
  });
});
