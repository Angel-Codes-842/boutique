import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "CAJERO", "VENDEDOR"]);
    if ("response" in authorization) return authorization.response;

    const { id } = await params;
    const body = await req.json();
    const cliente = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name,
        document: body.document || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        active: body.active !== false,
      },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN"]);
    if ("response" in authorization) return authorization.response;

    const { id } = await params;
    await prisma.customer.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar cliente" }, { status: 500 });
  }
}
