import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET() {
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const marcas = await prisma.brand.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(marcas);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener marcas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    const marca = await prisma.brand.create({
      data: {
        name: body.name,
        active: true,
      },
    });
    return NextResponse.json(marca, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear marca" }, { status: 500 });
  }
}
