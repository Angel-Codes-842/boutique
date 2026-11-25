import { NextResponse, connection } from "next/server";
import { authorizeApiRequest } from "@/lib/auth/session";
import { descargarArchivo } from "@/lib/factpy/service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; tipo: string }> }) {
  await connection(); // request-time: evitar prerender/cache con Cache Components
  const autorizacion = await authorizeApiRequest();
  if ("response" in autorizacion) return autorizacion.response;

  const { id, tipo } = await ctx.params;
  if (tipo !== "kude" && tipo !== "xml") {
    return NextResponse.json({ error: "Tipo de archivo inválido" }, { status: 400 });
  }

  try {
    const archivo = await descargarArchivo(id, tipo);
    const extension = tipo === "xml" ? "xml" : "pdf";
    return new NextResponse(new Blob([archivo.body], { type: archivo.contentType }), {
      headers: {
        "Content-Type": archivo.contentType,
        "Content-Disposition": `inline; filename="documento-${id}.${extension}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo descargar el archivo";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
