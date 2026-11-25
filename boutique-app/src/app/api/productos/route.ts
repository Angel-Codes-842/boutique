import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApiRequest } from "@/lib/auth/session";

export async function GET() {
  await connection(); // request-time: evitar prerender/cache con Cache Components
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const productos = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
      orderBy: { name: "asc" },
    });
    
    // Asegurar que todos los productos tengan al menos una variante
    for (const prod of productos) {
      if (prod.variants.length === 0) {
        await prisma.productVariant.create({
          data: {
            productId: prod.id,
            code: prod.code + '-STD',
            stock: 0,
            price: prod.price,
            active: true,
          },
        });
      }
    }
    
    const productosActualizados = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
      orderBy: { name: "asc" },
    });
    
    return NextResponse.json(productosActualizados);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authorization = await authorizeApiRequest(["ADMIN", "ALMACEN"]);
    if ("response" in authorization) return authorization.response;

    const body = await req.json();
    const producto = await prisma.product.create({
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
        active: true,
      },
    });

    if (producto.trackStock) {
      await prisma.productVariant.create({
        data: {
          productId: producto.id,
          code: producto.code + "-STD",
          stock: 0,
          price: producto.price,
          active: true,
        },
      });
    }

    const productoCompleto = await prisma.product.findUnique({
      where: { id: producto.id },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
    });

    return NextResponse.json(productoCompleto || producto, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}
