import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN"]);
    if ("response" in authorization) return authorization.response;

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const now = new Date();
    const from = fromParam ? startOfDay(new Date(fromParam)) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = toParam ? endOfDay(new Date(toParam)) : endOfDay(now);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: "Fechas inválidas" }, { status: 400 });
    }

    const [sales, cashSessions, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: from, lte: to } },
        include: {
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          payments: true,
          items: { include: { product: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cashSession.findMany({
        where: {
          OR: [
            { openedAt: { gte: from, lte: to } },
            { closedAt: { gte: from, lte: to } },
          ],
        },
        include: {
          user: { select: { id: true, name: true } },
          movements: { orderBy: { createdAt: "desc" } },
          _count: { select: { sales: true } },
        },
        orderBy: { openedAt: "desc" },
      }),
      prisma.cashMovement.findMany({
        where: {
          type: "EGRESO",
          createdAt: { gte: from, lte: to },
        },
        include: {
          cashSession: { select: { id: true, openedAt: true, closedAt: true, user: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const validSales = sales.filter((s) => s.status !== "ANULADA");
    const totalVentas = validSales.reduce((sum, s) => sum + s.total, 0);
    const totalDescuentos = validSales.reduce((sum, s) => sum + s.discount, 0);
    const cantidadVentas = validSales.length;
    const ticketPromedio = cantidadVentas ? Math.round(totalVentas / cantidadVentas) : 0;

    const porMetodo: Record<string, number> = {};
    for (const s of validSales) {
      porMetodo[s.paymentMethod] = (porMetodo[s.paymentMethod] || 0) + s.total;
    }

    const totalGastos = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCreditos = validSales.filter((s) => s.paymentMethod === "CREDITO").reduce((sum, s) => sum + Math.max(0, s.total - s.paidAmount), 0);
    const totalCobrado = validSales.reduce((sum, s) => sum + s.paidAmount, 0);

    const ventasPorDiaMap = new Map<string, { date: string; total: number; cantidad: number }>();
    for (const s of validSales) {
      const key = new Date(s.createdAt).toISOString().slice(0, 10);
      const prev = ventasPorDiaMap.get(key) || { date: key, total: 0, cantidad: 0 };
      prev.total += s.total;
      prev.cantidad += 1;
      ventasPorDiaMap.set(key, prev);
    }
    const ventasPorDia = Array.from(ventasPorDiaMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        totalVentas,
        cantidadVentas,
        ticketPromedio,
        totalDescuentos,
        totalGastos,
        totalCreditos,
        totalCobrado,
      },
      porMetodo,
      ventasPorDia,
      cashSessions: cashSessions.map((s) => ({
        id: s.id,
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingAmount: s.openingAmount,
        closingAmount: s.closingAmount,
        expectedAmount: s.expectedAmount,
        difference: s.difference,
        notes: s.notes,
        user: s.user,
        salesCount: s._count.sales,
        ingresos: s.movements.filter((m) => m.type === "INGRESO").reduce((a, m) => a + m.amount, 0),
        egresos: s.movements.filter((m) => m.type === "EGRESO").reduce((a, m) => a + m.amount, 0),
      })),
      expenses: expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        concept: e.concept,
        createdAt: e.createdAt,
        cashSession: e.cashSession,
      })),
      recentSales: sales.slice(0, 50).map((s) => ({
        id: s.id,
        number: s.number,
        documentType: s.documentType,
        total: s.total,
        paidAmount: s.paidAmount,
        paymentMethod: s.paymentMethod,
        status: s.status,
        createdAt: s.createdAt,
        customer: s.customer?.name || "Sin cliente",
        user: s.user?.name || "-",
      })),
    });
  } catch (error) {
    console.error("Error GET reportes:", error);
    return NextResponse.json({ error: "Error al obtener reportes" }, { status: 500 });
  }
}
