import { NextRequest, NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/session";
import { getFactpyPublicStatus } from "@/lib/factpy/config";
import { prisma } from "@/lib/prisma";

const ESTADOS = ["PENDIENTE", "APROBADO", "RECHAZADO", "ANULADO", "INUTILIZADO"] as const;
const TIPOS = [
  "FACTURA_CONTADO",
  "FACTURA_CREDITO_PLAZO",
  "FACTURA_CREDITO_CUOTAS",
  "RECIBO",
  "NOTA_CREDITO",
  "AUTOFACTURA",
  "NOTA_REMISION",
  "ANTICIPO",
  "FACTURA_EXPORTACION",
] as const;

export async function GET(req: NextRequest) {
  const autorizacion = await authorizeApiRequest();
  if ("response" in autorizacion) return autorizacion.response;

  const estado = req.nextUrl.searchParams.get("estado");
  const tipo = req.nextUrl.searchParams.get("tipo");
  const where = {
    ...(estado && ESTADOS.includes(estado as (typeof ESTADOS)[number])
      ? { status: estado as (typeof ESTADOS)[number] }
      : {}),
    ...(tipo && TIPOS.includes(tipo as (typeof TIPOS)[number])
      ? { kind: tipo as (typeof TIPOS)[number] }
      : {}),
  };

  const documentos = await prisma.electronicDocument.findMany({
    where,
    include: {
      sale: { select: { id: true, number: true, invoiceNumber: true, total: true, status: true } },
      customer: { select: { id: true, name: true, document: true } },
      payment: { select: { id: true, amount: true, method: true } },
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ documentos, factpy: getFactpyPublicStatus() });
}
