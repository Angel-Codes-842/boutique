import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET() {
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const categorias = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categorias);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    const categoria = await prisma.category.create({
      data: {
        name: body.name,
        description: body.description || null,
        active: true,
      },
    });
    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}
