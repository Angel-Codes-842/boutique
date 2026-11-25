import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { procesarAnulacionVenta } from "@/lib/factpy/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden anular ventas" }, { status: 403 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    if (sale.status === "ANULADA") {
      return NextResponse.json({ error: "La venta ya está anulada" }, { status: 400 });
    }

    const cashRefund =
      sale.paymentMethod === "EFECTIVO"
        ? sale.total
        : sale.paymentMethod === "CREDITO"
          ? sale.payments
              .filter((payment) => payment.method === "EFECTIVO")
              .reduce((sum, payment) => sum + payment.amount, 0)
          : 0;
    const cashSession =
      cashRefund > 0
        ? await prisma.cashSession.findFirst({ where: { status: "ABIERTA" } })
        : null;
    if (cashRefund > 0 && !cashSession) {
      return NextResponse.json({ error: "Abra una caja para registrar la devolución en efectivo." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Devolver stock
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { variants: true },
        });

        if (product && product.trackStock) {
          if (item.variantId && product.variants.length > 0) {
            const variant = product.variants.find((v) => v.id === item.variantId);
            if (variant) {
              await tx.productVariant.update({
                where: { id: variant.id },
                data: { stock: { increment: item.quantity } },
              });
            }
          } else if (product.variants.length > 0 && !item.variantId) {
            const variant = product.variants[0];
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            variantId: item.variantId,
            type: "ENTRADA",
            quantity: item.quantity,
            reason: `Anulación venta ${sale.number}`,
            reference: sale.id,
            userId: user.id,
          },
        });
      }

      if (sale.paymentMethod === "CREDITO" && sale.customerId) {
        const remainingDebt = Math.max(0, sale.total - sale.paidAmount);
        if (remainingDebt > 0) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { debt: { decrement: remainingDebt } },
          });
        }
      }

      if (cashRefund > 0 && cashSession) {
        await tx.cashMovement.create({
          data: {
            cashSessionId: cashSession.id,
            type: "EGRESO",
            amount: cashRefund,
            concept: `Devolución venta ${sale.number}`,
            reference: sale.id,
          },
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: "ANULADA" },
      });
    });

    let facturacion: Awaited<ReturnType<typeof procesarAnulacionVenta>> = { estado: "OMITIDO" };
    try {
      facturacion = await procesarAnulacionVenta(sale.id, `Anulación venta ${sale.number}`);
    } catch (error) {
      console.error("Error al procesar anulación electrónica:", error);
      facturacion = { estado: "ERROR", mensaje: "No se pudo procesar el evento electrónico" };
    }

    return NextResponse.json({ success: true, facturacion });
  } catch (error) {
    console.error("Error al anular venta:", error);
    return NextResponse.json({ error: "Error al anular venta" }, { status: 500 });
  }
}
