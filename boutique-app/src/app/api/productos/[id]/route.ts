import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "ALMACEN"]);
    if ("response" in authorization) return authorization.response;

    const { id } = await params;
    const body = await req.json();
    const producto = await prisma.product.update({
      where: { id },
      data: {
        code: body.code,
        barcode: body.barcode || null,
        name: body.name,
        description: body.description || null,
        categoryId: body.categoryId || null,
        brandId: body.brandId || null,
        price: Number(body.price),
        cost: Number(body.cost) || 0,
        minStock: Number(body.minStock) || 0,
        maxStock: Number(body.maxStock) || 0,
        trackStock: body.trackStock !== false,
        active: body.active !== false,
      },
    });
    return NextResponse.json(producto);
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN"]);
    if ("response" in authorization) return authorization.response;

    const { id } = await params;
    await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}
