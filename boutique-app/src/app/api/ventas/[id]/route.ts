import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection(); // request-time: evitar prerender/cache con Cache Components
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const { id } = await params;
    const venta = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        user: { select: { id: true, name: true, role: true } },
        items: { include: { product: true, variant: true } },
        payments: true,
      },
    });
    if (!venta) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    return NextResponse.json(venta);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener venta" }, { status: 500 });
  }
}
