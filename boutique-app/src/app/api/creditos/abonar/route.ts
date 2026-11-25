import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

const abonoSchema = z.object({
  saleId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "CAJERO"]);
    if ("response" in authorization) return authorization.response;

    const parsedBody = abonoSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Datos del abono inválidos" }, { status: 400 });
    }
    const { saleId, customerId, amount: abono } = parsedBody.data;

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { customer: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }
    if (sale.status === "ANULADA" || sale.customerId !== customerId) {
      return NextResponse.json({ error: "La venta no tiene una deuda activa para este cliente" }, { status: 400 });
    }

    const saldoPendiente = sale.total - sale.paidAmount;
    if (abono <= 0 || abono > saldoPendiente) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    const cashSession = await prisma.cashSession.findFirst({
      where: { status: "ABIERTA" },
    });
    if (!cashSession) {
      return NextResponse.json({ error: "Debe abrir una caja para registrar el abono" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const newPaid = sale.paidAmount + abono;
      const nuevoEstado = newPaid >= sale.total ? "PAGADA" : "PENDIENTE";

      const updatedSale = await tx.sale.updateMany({
        where: { id: saleId, status: sale.status, paidAmount: sale.paidAmount },
        data: {
          paidAmount: { increment: abono },
          status: nuevoEstado,
        },
      });
      if (updatedSale.count !== 1) {
        throw new Error("La deuda cambió mientras se registraba el abono.");
      }

      await tx.payment.create({
        data: {
          saleId: saleId,
          method: "EFECTIVO",
          amount: abono,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { debt: { decrement: abono } },
      });

      await tx.cashMovement.create({
        data: {
          cashSessionId: cashSession.id,
          type: "INGRESO",
          amount: abono,
          concept: `Abono crédito ${sale.number}`,
          reference: saleId,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error abono:", error);
    return NextResponse.json({ error: "Error al registrar abono" }, { status: 500 });
  }
}
