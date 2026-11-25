import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET() {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "ALMACEN"]);
    if ("response" in authorization) return authorization.response;

    const movimientos = await prisma.stockMovement.findMany({
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener movimientos" }, { status: 500 });
  }
}
