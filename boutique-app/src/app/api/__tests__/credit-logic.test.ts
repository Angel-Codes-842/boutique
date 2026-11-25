import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  calcularEstadoVenta,
  calcularNuevoEstadoDespuesAbono,
  calcularSaldo,
  puedeAnularVenta,
  validarAbono,
  validarAnulacionVenta,
} from "@/lib/credit-validations";

vi.mock("@/lib/prisma", () => {
  const mockPrisma: any = {
    user: {
      findUnique: vi.fn(),
    },
    sale: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    productVariant: {
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: mockPrisma };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

describe("credit-validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validarAbono", () => {
    it("abono no puede ser > saldo pendiente", () => {
      const res = validarAbono(100000, 30000, 80000);
      expect(res.valido).toBe(false);
      expect(res.saldoPendiente).toBe(70000);
      expect(res.motivo).toBe("El abono no puede ser mayor al saldo pendiente");
    });

    it("abono <= 0 inválido", () => {
      const res1 = validarAbono(100000, 0, 0);
      expect(res1.valido).toBe(false);
      expect(res1.saldoPendiente).toBe(100000);

      const res2 = validarAbono(100000, 20000, -5000);
      expect(res2.valido).toBe(false);
      expect(res2.saldoPendiente).toBe(80000);
    });

    it("acepta abono válido menor o igual al saldo pendiente", () => {
      const res1 = validarAbono(100000, 30000, 70000);
      expect(res1.valido).toBe(true);

      const res2 = validarAbono(100000, 0, 25000);
      expect(res2.valido).toBe(true);
    });
  });

  describe("calcularEstadoVenta después de abonar", () => {
    it("al cubrir total pasa a PAGADA", () => {
      const res1 = calcularNuevoEstadoDespuesAbono(100000, 30000, 70000);
      expect(res1.nuevoPaidAmount).toBe(100000);
      expect(res1.nuevoEstado).toBe("PAGADA");

      const res2 = calcularNuevoEstadoDespuesAbono(100000, 80000, 30000);
      expect(res2.nuevoPaidAmount).toBe(110000);
      expect(res2.nuevoEstado).toBe("PAGADA");
    });

    it("al abonar parcialmente queda PENDIENTE", () => {
      const res = calcularNuevoEstadoDespuesAbono(100000, 30000, 20000);
      expect(res.nuevoPaidAmount).toBe(50000);
      expect(res.nuevoEstado).toBe("PENDIENTE");
      expect(res.saldoPendiente).toBe(70000);
    });
  });

  describe("calcularEstadoVenta", () => {
    it("cuando paidAmount >= total retorna PAGADA", () => {
      expect(calcularEstadoVenta(100000, 100000)).toBe("PAGADA");
      expect(calcularEstadoVenta(100000, 150000)).toBe("PAGADA");
    });

    it("cuando paidAmount < total retorna PENDIENTE", () => {
      expect(calcularEstadoVenta(100000, 0)).toBe("PENDIENTE");
      expect(calcularEstadoVenta(100000, 99999)).toBe("PENDIENTE");
    });
  });

  describe("calcularSaldo", () => {
    it("calcula saldo = total - paidAmount", () => {
      expect(calcularSaldo(100000, 30000)).toBe(70000);
      expect(calcularSaldo(50000, 0)).toBe(50000);
      expect(calcularSaldo(75000, 75000)).toBe(0);
    });
  });
});

describe("anular venta - lógica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("autorización", () => {
    it("al anular venta solo ADMIN puede anular", () => {
      expect(puedeAnularVenta("ADMIN")).toBe(true);
      const resAdmin = validarAnulacionVenta("ADMIN");
      expect(resAdmin.valido).toBe(true);

      expect(puedeAnularVenta("CAJERO")).toBe(false);
      const resCajero = validarAnulacionVenta("CAJERO");
      expect(resCajero.valido).toBe(false);
      expect(resCajero.motivo).toBe("Solo administradores pueden anular ventas");

      expect(puedeAnularVenta("VENDEDOR")).toBe(false);
      const resVendedor = validarAnulacionVenta("VENDEDOR");
      expect(resVendedor.valido).toBe(false);

      expect(puedeAnularVenta("ALMACEN")).toBe(false);
      const resAlmacen = validarAnulacionVenta("ALMACEN");
      expect(resAlmacen.valido).toBe(false);
    });
  });

  describe("devolución de stock al anular", () => {
    it("al anular se devuelve stock (validar lógica)", async () => {
      const sale = {
        id: "sale1",
        number: "T-00000001",
        status: "PAGADA",
        items: [
          { id: "si1", productId: "p1", variantId: "v1", quantity: 2 },
          { id: "si2", productId: "p2", variantId: null, quantity: 1 },
        ],
        payments: [],
      };

      const product1 = {
        id: "p1",
        name: "Camiseta",
        trackStock: true,
        variants: [{ id: "v1", stock: 5 }],
      };

      const product2 = {
        id: "p2",
        name: "Pantalón",
        trackStock: true,
        variants: [{ id: "v2", stock: 3 }],
      };

      (prisma.sale.findUnique as any).mockResolvedValue(sale);
      (getSession as any).mockResolvedValue({ id: "u1", role: "ADMIN" });
      (prisma.product.findUnique as any)
        .mockResolvedValueOnce(product1)
        .mockResolvedValueOnce(product2);

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          product: {
            findUnique: vi.fn()
              .mockResolvedValueOnce(product1)
              .mockResolvedValueOnce(product2),
          },
          productVariant: {
            update: vi.fn().mockResolvedValue({}),
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({}),
          },
          sale: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const { POST } = await import("@/app/api/ventas/[id]/anular/route");
      const req = new Request("http://localhost/api/ventas/sale1/anular", {
        method: "POST",
        body: JSON.stringify({ userId: "u1" }),
      }) as any;

      const res = await POST(req, { params: Promise.resolve({ id: "sale1" }) });
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("al anular con variante específica incrementa stock de esa variante", async () => {
      const sale = {
        id: "sale2",
        number: "T-00000002",
        status: "PAGADA",
        items: [{ id: "si1", productId: "p1", variantId: "v1", quantity: 3 }],
        payments: [],
      };

      const product = {
        id: "p1",
        name: "Zapatos",
        trackStock: true,
        variants: [{ id: "v1", stock: 2 }],
      };

      (prisma.sale.findUnique as any).mockResolvedValue(sale);
      (getSession as any).mockResolvedValue({ id: "u1", role: "ADMIN" });

      let variantIncremented = false;
      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          product: {
            findUnique: vi.fn().mockResolvedValue(product),
          },
          productVariant: {
            update: vi.fn().mockImplementation((args: any) => {
              if (args.data.stock.increment === 3) {
                variantIncremented = true;
              }
              return {};
            }),
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({}),
          },
          sale: {
            update: vi.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const { POST } = await import("@/app/api/ventas/[id]/anular/route");
      const req = new Request("http://localhost/api/ventas/sale2/anular", {
        method: "POST",
        body: JSON.stringify({ userId: "u1" }),
      }) as any;

      await POST(req, { params: Promise.resolve({ id: "sale2" }) });
      expect(variantIncremented).toBe(true);
    });

    it("solo ADMIN puede anular - rechaza si no es ADMIN", async () => {
      (getSession as any).mockResolvedValue({ id: "u2", role: "CAJERO" });

      const { POST } = await import("@/app/api/ventas/[id]/anular/route");
      const req = new Request("http://localhost/api/ventas/sale1/anular", {
        method: "POST",
        body: JSON.stringify({ userId: "u2" }),
      }) as any;

      const res = await POST(req, { params: Promise.resolve({ id: "sale1" }) });
      const data = await res.json();
      expect(res.status).toBe(403);
      expect(data.error).toBe("Solo administradores pueden anular ventas");
    });
  });
});
