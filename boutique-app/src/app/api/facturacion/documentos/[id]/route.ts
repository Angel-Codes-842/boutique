import { NextResponse, connection } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection(); // request-time: evitar prerender/cache con Cache Components
  const autorizacion = await authorizeApiRequest();
  if ("response" in autorizacion) return autorizacion.response;

  const { id } = await ctx.params;
  const documento = await prisma.electronicDocument.findUnique({
    where: { id },
    include: {
      sale: { select: { id: true, number: true, invoiceNumber: true, total: true } },
      customer: { select: { id: true, name: true, document: true, email: true } },
      payment: { select: { id: true, amount: true, method: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  return NextResponse.json(documento);
}
