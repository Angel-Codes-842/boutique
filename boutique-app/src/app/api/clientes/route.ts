import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET() {
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const clientes = await prisma.customer.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "CAJERO", "VENDEDOR"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    const cliente = await prisma.customer.create({
      data: {
        name: body.name,
        document: body.document || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        active: true,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear cliente" }, { status: 500 });
  }
}
