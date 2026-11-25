import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";
import { getFactpyPublicStatus } from "@/lib/factpy/config";

export async function GET() {
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    let config = await prisma.storeConfig.findFirst();
    if (!config) {
      config = await prisma.storeConfig.create({
        data: { name: "Mi Boutique", ticketPrefix: "T", ticketNumber: 1 },
      });
    }
    return NextResponse.json({ ...config, factpy: getFactpyPublicStatus() });
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    let config = await prisma.storeConfig.findFirst();
    if (!config) {
      config = await prisma.storeConfig.create({ data: {} });
    }
    const updated = await prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        name: body.name,
        ruc: body.ruc || null,
        address: body.address || null,
        phone: body.phone || null,
        ticketPrefix: body.ticketPrefix || "T",
        ...(body.ticketNumber != null && Number(body.ticketNumber) > 0
          ? { ticketNumber: Number(body.ticketNumber) }
          : {}),
        establecimiento: body.establecimiento || config.establecimiento || "001",
        puntoExpedicion: body.puntoExpedicion || config.puntoExpedicion || "001",
        timbrado: body.timbrado || null,
        timbradoVigencia: body.timbradoVigencia ? new Date(body.timbradoVigencia) : null,
        ...(body.invoiceNumber != null && Number(body.invoiceNumber) > 0
          ? { invoiceNumber: Number(body.invoiceNumber) }
          : {}),
        ...(body.creditoPlazoDias != null && Number(body.creditoPlazoDias) > 0
          ? { creditoPlazoDias: Math.min(Number(body.creditoPlazoDias), 365) }
          : {}),
        factpyContingencia:
          body.factpyContingencia === undefined
            ? config.factpyContingencia
            : Boolean(body.factpyContingencia),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
