import { NextRequest, NextResponse, connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";
import { emitirFacturaDeVenta } from "@/lib/factpy/service";

const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().min(1).nullable().optional(),
        quantity: z.number().int().positive().max(1000),
      })
    )
    .min(1)
    .max(100),
  customerId: z.string().min(1).nullable().optional(),
  paymentMethod: z.enum(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CREDITO"]),
  paidAmount: z.number().int().nonnegative().optional(),
  discount: z.number().int().nonnegative().default(0),
  documentType: z.enum(["TICKET", "FACTURA"]).default("TICKET"),
});

class StockConflictError extends Error {}

export async function GET() {
  await connection(); // request-time: evitar prerender/cache con Cache Components
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const ventas = await prisma.sale.findMany({
      include: {
        customer: true,
        user: { select: { id: true, name: true, role: true } },
        items: {
          include: {
            product: { select: { id: true, code: true, name: true, price: true } },
            variant: true,
          },
        },
        payments: true,
        cashSession: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(ventas);
  } catch (error) {
    console.error("Error al obtener ventas:", error);
    return NextResponse.json({ error: "Error al obtener ventas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "CAJERO", "VENDEDOR"]);
    if ("response" in authorization) return authorization.response;
    const currentUser = authorization.user;

    const parsedBody = saleSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "No hay productos en la venta" }, { status: 400 });
    }
    const { items, customerId, paymentMethod, paidAmount, discount, documentType } = parsedBody.data;

    const cashSession = await prisma.cashSession.findFirst({
      where: { status: "ABIERTA" },
    });

    if (!cashSession) {
      return NextResponse.json({ error: "No hay caja abierta. Debe abrir la caja primero." }, { status: 400 });
    }

    const saleItems: {
      productId: string;
      variantId: string | null;
      quantity: number;
      unitPrice: number;
      trackStock: boolean;
    }[] = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: { variants: true },
      });
      if (!product || !product.active) {
        return NextResponse.json({ error: "Producto no encontrado o inactivo" }, { status: 400 });
      }

      if (item.variantId) {
        const variant = product.variants.find((entry) => entry.id === item.variantId && entry.active);
        if (!variant) {
          return NextResponse.json({ error: `Variante inválida para ${product.name}` }, { status: 400 });
        }
        if (product.trackStock && variant.stock < item.quantity) {
          return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });
        }
        saleItems.push({
          productId: product.id,
          variantId: variant.id,
          quantity: item.quantity,
          unitPrice: variant.price ?? product.price,
          trackStock: product.trackStock,
        });
      } else if (product.trackStock && product.variants.length > 0) {
        let remaining = item.quantity;
        for (const variant of product.variants.filter((entry) => entry.active && entry.stock > 0)) {
          if (remaining === 0) break;
          const allocatedQuantity = Math.min(remaining, variant.stock);
          saleItems.push({
            productId: product.id,
            variantId: variant.id,
            quantity: allocatedQuantity,
            unitPrice: variant.price ?? product.price,
            trackStock: true,
          });
          remaining -= allocatedQuantity;
        }
        if (remaining > 0) {
          return NextResponse.json({ error: `Stock insuficiente para ${product.name}` }, { status: 400 });
        }
      } else {
        saleItems.push({
          productId: product.id,
          variantId: null,
          quantity: item.quantity,
          unitPrice: product.price,
          trackStock: product.trackStock,
        });
      }
    }

    const subtotal = saleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (!Number.isSafeInteger(subtotal) || discount > subtotal) {
      return NextResponse.json({ error: "El descuento o el total de la venta es inválido" }, { status: 400 });
    }
    const total = subtotal - discount;

    const isCredito = paymentMethod === "CREDITO";
    const receivedAmount = paidAmount ?? total;
    if (isCredito && (!customerId || receivedAmount > total)) {
      return NextResponse.json({ error: "La venta a crédito requiere cliente y un abono válido" }, { status: 400 });
    }
    if (paymentMethod === "EFECTIVO" && receivedAmount < total) {
      return NextResponse.json({ error: "El monto recibido es menor al total" }, { status: 400 });
    }
    const paidAmt = isCredito ? receivedAmount : total;
    const saleStatus = isCredito && paidAmt < total ? "PENDIENTE" : "PAGADA";
    const changeAmt = paymentMethod === "EFECTIVO" ? receivedAmount - total : 0;

    const customer = customerId
      ? await prisma.customer.findUnique({ where: { id: customerId } })
      : null;
    if (customerId && (!customer || !customer.active)) {
      return NextResponse.json({ error: "Cliente no encontrado o inactivo" }, { status: 400 });
    }
    if (documentType === "FACTURA" && (!customerId || !customer?.document)) {
      return NextResponse.json({ error: "Para emitir factura seleccione un cliente con RUC/CI" }, { status: 400 });
    }

    const sale = await prisma.$transaction(async (tx) => {
      let config = await tx.storeConfig.findFirst();
      if (!config) {
        config = await tx.storeConfig.create({ data: { id: "default" } });
      }

      const updatedConfig = await tx.storeConfig.update({
        where: { id: config.id },
        data: {
          ticketNumber: { increment: 1 },
          ...(documentType === "FACTURA" ? { invoiceNumber: { increment: 1 } } : {}),
        },
        select: {
          ticketPrefix: true,
          ticketNumber: true,
          establecimiento: true,
          puntoExpedicion: true,
          invoiceNumber: true,
        },
      });
      const saleNumber = `${updatedConfig.ticketPrefix}-${String(updatedConfig.ticketNumber - 1).padStart(8, "0")}`;
      let invoiceNumber = null;
      if (documentType === "FACTURA") {
        invoiceNumber = `${updatedConfig.establecimiento || "001"}-${updatedConfig.puntoExpedicion || "001"}-${String(updatedConfig.invoiceNumber - 1).padStart(7, "0")}`;
      }

      const newSale = await tx.sale.create({
        data: {
          number: saleNumber,
          invoiceNumber,
          documentType,
          customerId: customerId || null,
          userId: currentUser.id,
          cashSessionId: cashSession.id,
          status: saleStatus,
          paymentMethod,
          subtotal,
          discount,
          total,
          paidAmount: paidAmt,
          changeAmount: changeAmt,
        },
      });

      for (const item of saleItems) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: 0,
            total: item.unitPrice * item.quantity,
          },
        });

        if (item.trackStock && item.variantId) {
          const stockUpdate = await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (stockUpdate.count !== 1) {
            throw new StockConflictError("El stock cambió durante la venta.");
          }
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId || null,
            type: "VENTA",
            quantity: -item.quantity,
            reason: `Venta ${saleNumber}`,
            reference: newSale.id,
            userId: currentUser.id,
          },
        });
      }

      if (paidAmt > 0) {
        await tx.payment.create({
          data: {
            saleId: newSale.id,
            method: isCredito ? "EFECTIVO" : paymentMethod,
            amount: paidAmt,
          },
        });
        if (paymentMethod === "EFECTIVO" || isCredito) {
          await tx.cashMovement.create({
            data: {
              cashSessionId: cashSession.id,
              type: "INGRESO",
              amount: paidAmt,
              concept: `Venta ${saleNumber}`,
              reference: newSale.id,
            },
          });
        }
      }

      if (isCredito && customerId) {
        const saldoPendiente = total - paidAmt;
        if (saldoPendiente > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { debt: { increment: saldoPendiente } },
          });
        }
      }

      return newSale;
    });

    // La venta ya quedó confirmada: si FACTPY está activo se emite el DE y se
    // guarda el resultado. Un fallo de facturación nunca borra la venta.
    let facturacion: Awaited<ReturnType<typeof emitirFacturaDeVenta>> = { estado: "OMITIDO" };
    try {
      facturacion = await emitirFacturaDeVenta(sale.id);
    } catch (error) {
      console.error("Error al emitir factura electrónica:", error);
      facturacion = { estado: "ERROR", mensaje: "No se pudo emitir el documento electrónico" };
    }

    return NextResponse.json({ ...sale, facturacion }, { status: 201 });
  } catch (error) {
    if (error instanceof StockConflictError) {
      return NextResponse.json({ error: "El stock cambió. Actualice el carrito e intente nuevamente." }, { status: 409 });
    }
    console.error("Error al crear venta:", error);
    return NextResponse.json({ error: "Error al crear venta" }, { status: 500 });
  }
}
