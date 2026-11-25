import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET() {
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const session = await prisma.cashSession.findFirst({
      where: { status: "ABIERTA" },
      include: {
        user: { select: { id: true, name: true, role: true } },
        sales: { include: { payments: true } },
        movements: true,
      },
      orderBy: { openedAt: "desc" },
    });
    const historial = await prisma.cashSession.findMany({
      where: { status: "CERRADA" },
      include: {
        user: { select: { name: true } },
        movements: {
          select: { type: true, amount: true, concept: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { sales: true } },
      },
      orderBy: { closedAt: "desc" },
      take: 20,
    });

    // Se mantiene la forma de respuesta anterior para no romper /pos.
    if (session) return NextResponse.json({ ...session, historial });
    return NextResponse.json({ status: "CERRADA", historial });
  } catch (error) {
    console.error("Error GET caja:", error);
    return NextResponse.json({ error: "Error al obtener caja" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "CAJERO"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    const { action, openingAmount, amount, concept } = body;

    if (action === "abrir") {
      const existing = await prisma.cashSession.findFirst({ where: { status: "ABIERTA" } });
      if (existing) {
        return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 400 });
      }

      const userId = authorization.user.id;

      const openingAmountValue = Number(openingAmount);
      if (!Number.isSafeInteger(openingAmountValue) || openingAmountValue < 0) {
        return NextResponse.json({ error: "Monto de apertura inválido" }, { status: 400 });
      }

      const session = await prisma.$transaction(async (tx) => {
        const openedSession = await tx.cashSession.create({
          data: { userId, openingAmount: openingAmountValue, status: "ABIERTA" },
        });
        await tx.cashMovement.create({
          data: {
            cashSessionId: openedSession.id,
            type: "APERTURA",
            amount: openingAmountValue,
            concept: "Apertura de caja",
          },
        });
        return openedSession;
      });

      return NextResponse.json(session, { status: 201 });
    }

    if (action === "reabrir") {
      if (authorization.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Solo un administrador puede reabrir la caja" }, { status: 403 });
      }

      const existing = await prisma.cashSession.findFirst({ where: { status: "ABIERTA" } });
      if (existing) {
        return NextResponse.json({ error: "Ya hay una caja abierta" }, { status: 400 });
      }

      const lastClosed = await prisma.cashSession.findFirst({
        where: { status: "CERRADA" },
        orderBy: { closedAt: "desc" },
      });
      if (!lastClosed) {
        return NextResponse.json({ error: "No hay una caja cerrada para reabrir" }, { status: 400 });
      }

      // Se abre una sesión NUEVA con el efectivo contado de la última sesión.
      // La sesión cerrada queda intacta para auditoría.
      const openingAmount = lastClosed.closingAmount ?? lastClosed.expectedAmount ?? 0;
      if (!Number.isSafeInteger(openingAmount) || openingAmount < 0) {
        return NextResponse.json({ error: "Monto inicial inválido en la última caja" }, { status: 400 });
      }

      const session = await prisma.$transaction(async (tx) => {
        const openedSession = await tx.cashSession.create({
          data: {
            userId: authorization.user.id,
            openingAmount,
            status: "ABIERTA",
            notes: `Reapertura de la sesión ${lastClosed.id}`,
          },
        });
        await tx.cashMovement.create({
          data: {
            cashSessionId: openedSession.id,
            type: "APERTURA",
            amount: openingAmount,
            concept: `Reapertura de caja (sesión ${lastClosed.id})`,
          },
        });
        return openedSession;
      });

      return NextResponse.json(session, { status: 201 });
    }

    if (action === "ingreso" || action === "egreso") {
      const session = await prisma.cashSession.findFirst({ where: { status: "ABIERTA" } });
      if (!session) return NextResponse.json({ error: "No hay caja abierta" }, { status: 400 });
      const amountValue = Number(amount);
      if (!Number.isSafeInteger(amountValue) || amountValue <= 0) {
        return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
      }
      const movement = await prisma.cashMovement.create({
        data: {
          cashSessionId: session.id,
          type: action === "ingreso" ? "INGRESO" : "EGRESO",
          amount: amountValue,
          concept: concept || (action === "ingreso" ? "Ingreso" : "Egreso"),
        },
      });
      return NextResponse.json(movement, { status: 201 });
    }

    if (action === "cerrar") {
      const session = await prisma.cashSession.findFirst({
        where: { status: "ABIERTA" },
        include: { movements: true },
      });
      if (!session) return NextResponse.json({ error: "No hay caja abierta" }, { status: 400 });
      const closingAmountValue =
        body.closingAmount === undefined || body.closingAmount === ""
          ? null
          : Number(body.closingAmount);
      if (
        closingAmountValue !== null &&
        (!Number.isSafeInteger(closingAmountValue) || closingAmountValue < 0)
      ) {
        return NextResponse.json({ error: "Monto de cierre inválido" }, { status: 400 });
      }

      const ingresos = session.movements.filter(m => m.type === "INGRESO").reduce((sum, m) => sum + m.amount, 0);
      const egresos = session.movements.filter(m => m.type === "EGRESO").reduce((sum, m) => sum + m.amount, 0);
      const expected = session.openingAmount + ingresos - egresos;
      const closingAmount = closingAmountValue ?? expected;
      const difference = closingAmount - expected;

      const closed = await prisma.$transaction(async (tx) => {
        const result = await tx.cashSession.updateMany({
          where: { id: session.id, status: "ABIERTA" },
          data: {
            closedAt: new Date(),
            closingAmount,
            expectedAmount: expected,
            difference,
            status: "CERRADA",
            notes: body.notes || null,
          },
        });
        if (result.count !== 1) {
          throw new Error("La caja ya fue cerrada por otra solicitud.");
        }
        await tx.cashMovement.create({
          data: {
            cashSessionId: session.id,
            type: "CIERRE",
            amount: closingAmount,
            concept: "Cierre de caja",
          },
        });
        return tx.cashSession.findUniqueOrThrow({ where: { id: session.id } });
      });
      return NextResponse.json(closed);
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    console.error("Error POST caja:", error);
    return NextResponse.json({ error: "Error en caja" }, { status: 500 });
  }
}
