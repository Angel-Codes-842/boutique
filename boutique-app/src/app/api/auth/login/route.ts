import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieMaxAge } from "@/lib/auth/session-token";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  try {
    const parsedBody = loginSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 });
    }

    const { username, password } = parsedBody.data;
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const passwordCheck = await verifyPassword(password, user.password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
    if (passwordCheck.needsRehash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    }

    const cookieStore = await cookies();
    const token = await createSessionToken(user.id);
    cookieStore.set("boutique_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: sessionCookieMaxAge,
    });

    return NextResponse.json({ user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return NextResponse.json({ error: "Error al iniciar sesión" }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: "boutique_session", path: "/" });
  return NextResponse.json({ success: true });
}
