import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { crearEvento } from "@/lib/factpy/service";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  tipo: z.enum(["CANCELACION", "INUTILIZACION", "NOMINACION"]),
  documentId: z.string().min(1).optional(),
  cdc: z.string().min(1).optional(),
  motivo: z.string().min(1).max(500).optional(),
  timbrado: z.string().min(1).optional(),
  tipoDoc: z.string().min(1).optional(),
  establecimiento: z.string().min(1).optional(),
  punto: z.string().min(1).optional(),
  desde: z.string().min(1).optional(),
  hasta: z.string().min(1).optional(),
  nombre: z.string().min(1).optional(),
  ruc: z.string().min(1).optional(),
  correo: z.string().optional(),
});

export async function GET() {
  const autorizacion = await authorizeApiRequest();
  if ("response" in autorizacion) return autorizacion.response;
  const eventos = await prisma.factpyEvent.findMany({
    include: { document: { select: { receiptid: true, numero: true, kind: true, cdc: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ eventos });
}

export async function POST(req: NextRequest) {
  const autorizacion = await authorizeApiRequest(["ADMIN"]);
  if ("response" in autorizacion) return autorizacion.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos del evento inválidos" }, { status: 400 });

  try {
    const resultado = await crearEvento(parsed.data);
    const status = resultado.estado === "RECHAZADO" ? 400 : 200;
    return NextResponse.json(resultado, { status });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo registrar el evento";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
