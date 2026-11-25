import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApiRequest } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeApiRequest();
    if ("response" in authorization) return authorization.response;

    const parsedBody = passwordSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener entre 12 y 128 caracteres." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authorization.user.id },
      select: { id: true, password: true },
    });
    if (!user || !(await verifyPassword(parsedBody.data.currentPassword, user.password)).valid) {
      return NextResponse.json({ error: "La contraseña actual es incorrecta." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(parsedBody.data.newPassword) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json({ error: "No se pudo cambiar la contraseña." }, { status: 500 });
  }
}
