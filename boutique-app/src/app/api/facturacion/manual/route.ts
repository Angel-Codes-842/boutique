import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { emitirDocumentoManual } from "@/lib/factpy/service";

const schema = z.object({
  tipo: z.enum(["AUTOFACTURA", "NOTA_REMISION", "ANTICIPO", "FACTURA_EXPORTACION"]),
  cliente: z.object({
    ruc: z.string().optional(),
    nombre: z.string().min(1),
    direccion: z.string().optional(),
    correo: z.string().optional(),
    telefono: z.string().optional(),
    cpais: z.string().optional(),
    numCasa: z.coerce.number().int().optional(),
    documentType: z.string().optional(),
  }),
  items: z.array(z.object({
    descripcion: z.string().min(1),
    codigo: z.string().optional(),
    cantidad: z.coerce.number().int().positive(),
    precioUnitario: z.coerce.number().int().nonnegative(),
    total: z.coerce.number().int().nonnegative(),
    exento: z.boolean().optional(),
  })).min(1),
  total: z.coerce.number().int().positive(),
  descripcion: z.string().optional(),
  campos: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const autorizacion = await authorizeApiRequest(["ADMIN", "CAJERO"]);
  if ("response" in autorizacion) return autorizacion.response;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos del documento inválidos", detalle: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const resultado = await emitirDocumentoManual(parsed.data);
    const status = resultado.estado === "ERROR" ? 400 : 200;
    return NextResponse.json(resultado, { status });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo emitir el documento";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
