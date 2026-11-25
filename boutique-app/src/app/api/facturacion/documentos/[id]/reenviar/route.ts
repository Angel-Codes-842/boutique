import { NextResponse } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/session";
import { reenviarDocumento } from "@/lib/factpy/service";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const autorizacion = await authorizeApiRequest(["ADMIN"]);
  if ("response" in autorizacion) return autorizacion.response;

  const { id } = await ctx.params;
  const resultado = await reenviarDocumento(id);
  const status = resultado.estado === "ERROR" ? 400 : 200;
  return NextResponse.json(resultado, { status });
}
