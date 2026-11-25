export interface SaleItemInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export interface ProductVariant {
  id: string;
  stock: number;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  trackStock: boolean;
  variants?: ProductVariant[];
  [key: string]: any;
}

export function validateCashSession(cashSession: any) {
  if (!cashSession) {
    throw new Error("No hay caja abierta. Debe abrir la caja primero.");
  }
  return true;
}

export function validateItems(items?: SaleItemInput[] | null) {
  if (!items || items.length === 0) {
    throw new Error("No hay productos en la venta");
  }
  return true;
}

export function validateCreditSale(params: {
  paymentMethod?: string;
  customerId?: string | null;
}) {
  const { paymentMethod, customerId } = params;
  if (paymentMethod === "CREDITO") {
    if (!customerId) {
      throw new Error("Debe seleccionar un cliente para venta a crédito");
    }
  }
  return true;
}

export function validateStock(product: Product | null, item: SaleItemInput) {
  if (!product) {
    throw new Error("Producto no encontrado");
  }
  if (product.trackStock) {
    if (item.variantId) {
      const variant = product.variants?.find((v) => v.id === item.variantId);
      if (!variant || variant.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }
    } else if (product.variants && product.variants.length > 0) {
      const variantStock = product.variants.reduce(
        (sum, v) => sum + (v.stock || 0),
        0
      );
      if (variantStock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}`);
      }
    }
  }
  return true;
}

export function calculateTotals(
  items: SaleItemInput[],
  discount: number = 0
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const total = subtotal - discount;
  return {
    subtotal,
    discount,
    total,
  };
}
