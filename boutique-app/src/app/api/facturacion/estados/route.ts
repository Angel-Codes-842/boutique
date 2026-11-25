import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { sincronizarEstados } from "@/lib/factpy/service";

const schema = z.object({
  ids: z.array(z.string().min(1)).optional(),
});

export async function POST(req: NextRequest) {
  const autorizacion = await authorizeApiRequest(["ADMIN"]);
  if ("response" in autorizacion) return autorizacion.response;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  try {
    const resultado = await sincronizarEstados(parsed.data.ids);
    return NextResponse.json(resultado);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudieron consultar los estados";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
