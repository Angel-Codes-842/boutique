import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "ALMACEN"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    const { productId, type, quantity, reason, variantId } = body;

    if (!productId || !type || !quantity) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const qty = Number(quantity);
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (product.variants.length > 0) {
        const targetVariant = variantId 
          ? product.variants.find(v => v.id === variantId)
          : product.variants[0];
        
        if (targetVariant) {
          if (type === "ENTRADA") {
            await tx.productVariant.update({
              where: { id: targetVariant.id },
              data: { stock: { increment: qty } },
            });
          } else if (type === "SALIDA") {
            await tx.productVariant.update({
              where: { id: targetVariant.id },
              data: { stock: { decrement: qty } },
            });
          } else if (type === "AJUSTE") {
            await tx.productVariant.update({
              where: { id: targetVariant.id },
              data: { stock: qty },
            });
          }
        }
      }

      let moveQty = qty;
      if (type === "SALIDA") moveQty = -qty;
      if (type === "AJUSTE") moveQty = qty;

      await tx.stockMovement.create({
        data: {
          productId: productId,
          variantId: variantId || (product.variants[0]?.id || null),
          type: type,
          quantity: type === "SALIDA" ? -qty : qty,
          reason: reason || `Ajuste manual - ${type}`,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error ajuste:", error);
    return NextResponse.json({ error: "Error al registrar ajuste" }, { status: 500 });
  }
}
