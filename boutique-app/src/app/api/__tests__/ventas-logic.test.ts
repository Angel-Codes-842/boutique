import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  validateCashSession,
  validateItems,
  validateCreditSale,
  validateStock,
  calculateTotals,
} from "@/lib/venta-validators";

vi.mock("@/lib/prisma", () => {
  const mockPrisma: any = {
    cashSession: {
      findFirst: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
    },
    storeConfig: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    sale: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    saleItem: {
      create: vi.fn(),
    },
    productVariant: {
      update: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    payment: {
      create: vi.fn(),
    },
    customer: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prisma: mockPrisma };
});

describe("venta-validators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requiere caja abierta", () => {
    it("debe lanzar error si no hay caja abierta", () => {
      expect(() => validateCashSession(null)).toThrow(
        "No hay caja abierta. Debe abrir la caja primero."
      );
      expect(() => validateCashSession(undefined)).toThrow(
        "No hay caja abierta. Debe abrir la caja primero."
      );
    });

    it("debe pasar si hay caja abierta", () => {
      const cashSession = { id: "cs1", status: "ABIERTA" };
      expect(validateCashSession(cashSession)).toBe(true);
    });
  });

  describe("valida items", () => {
    it("debe lanzar error si no hay items", () => {
      expect(() => validateItems([])).toThrow("No hay productos en la venta");
      expect(() => validateItems(null as any)).toThrow("No hay productos en la venta");
      expect(() => validateItems(undefined)).toThrow("No hay productos en la venta");
    });

    it("debe pasar si hay items", () => {
      const items = [{ productId: "p1", quantity: 1, unitPrice: 1000 }];
      expect(validateItems(items)).toBe(true);
    });
  });

  describe("valida stock insuficiente", () => {
    it("debe lanzar error si producto no encontrado", () => {
      const item = { productId: "p1", quantity: 1, unitPrice: 1000 };
      expect(() => validateStock(null, item)).toThrow("Producto no encontrado");
    });

    it("debe lanzar error si stock insuficiente con variante específica", () => {
      const product = {
        id: "p1",
        name: "Camiseta",
        trackStock: true,
        variants: [{ id: "v1", stock: 2 }],
      };
      const item = { productId: "p1", variantId: "v1", quantity: 5, unitPrice: 1000 };
      expect(() => validateStock(product, item)).toThrow(
        "Stock insuficiente para Camiseta"
      );
    });

    it("debe pasar si hay stock suficiente con variante", () => {
      const product = {
        id: "p1",
        name: "Camiseta",
        trackStock: true,
        variants: [{ id: "v1", stock: 10 }],
      };
      const item = { productId: "p1", variantId: "v1", quantity: 5, unitPrice: 1000 };
      expect(validateStock(product, item)).toBe(true);
    });

    it("debe validar stock cuando no se especifica variante pero hay variantes", () => {
      const product = {
        id: "p1",
        name: "Pantalón",
        trackStock: true,
        variants: [
          { id: "v1", stock: 2 },
          { id: "v2", stock: 1 },
        ],
      };
      const item = { productId: "p1", quantity: 5, unitPrice: 1000 };
      expect(() => validateStock(product, item)).toThrow(
        "Stock insuficiente para Pantalón"
      );
    });

    it("debe pasar si no se trackea stock", () => {
      const product = {
        id: "p1",
        name: "Servicio",
        trackStock: false,
        variants: [],
      };
      const item = { productId: "p1", quantity: 100, unitPrice: 1000 };
      expect(validateStock(product, item)).toBe(true);
    });
  });

  describe("calcula totales/descuento", () => {
    it("debe calcular subtotal y total sin descuento", () => {
      const items = [
        { productId: "p1", quantity: 2, unitPrice: 10000 },
        { productId: "p2", quantity: 1, unitPrice: 5000 },
      ];
      const result = calculateTotals(items, 0);
      expect(result.subtotal).toBe(25000);
      expect(result.total).toBe(25000);
      expect(result.discount).toBe(0);
    });

    it("debe calcular totales con descuento", () => {
      const items = [
        { productId: "p1", quantity: 1, unitPrice: 100000 },
      ];
      const result = calculateTotals(items, 10000);
      expect(result.subtotal).toBe(100000);
      expect(result.total).toBe(90000);
      expect(result.discount).toBe(10000);
    });

    it("debe calcular correctamente con múltiples items y descuento", () => {
      const items = [
        { productId: "p1", quantity: 3, unitPrice: 5000 },
        { productId: "p2", quantity: 2, unitPrice: 7500 },
      ];
      const result = calculateTotals(items, 5000);
      expect(result.subtotal).toBe(30000);
      expect(result.total).toBe(25000);
    });
  });

  describe("venta a crédito sin cliente debe fallar", () => {
    it("debe lanzar error si es venta a crédito sin cliente", () => {
      expect(() =>
        validateCreditSale({ paymentMethod: "CREDITO", customerId: null })
      ).toThrow("Debe seleccionar un cliente para venta a crédito");
      expect(() =>
        validateCreditSale({ paymentMethod: "CREDITO", customerId: undefined })
      ).toThrow("Debe seleccionar un cliente para venta a crédito");
    });

    it("debe pasar si es venta a crédito con cliente", () => {
      expect(
        validateCreditSale({ paymentMethod: "CREDITO", customerId: "c1" })
      ).toBe(true);
    });

    it("debe pasar si no es venta a crédito", () => {
      expect(
        validateCreditSale({ paymentMethod: "EFECTIVO", customerId: null })
      ).toBe(true);
    });
  });
});
