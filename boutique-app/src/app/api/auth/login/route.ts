import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, sessionCookieMaxAge } from "@/lib/auth/session-token";
import {
  checkRateLimit,
  clearRateLimit,
  getClientIp,
  recordRateLimitFailure,
  type RateLimitOptions,
  type RateLimitResult,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
  // Honeypot: los bots suelen rellenar campos ocultos. Un humano lo deja vacío.
  website: z.string().max(0).optional(),
});

const IP_LIMIT: RateLimitOptions = { limit: 20, windowMs: 15 * 60 * 1000 };
const USER_LIMIT: RateLimitOptions = { limit: 5, windowMs: 15 * 60 * 1000 };

const CREDENCIALES_INVALIDAS = { error: "Credenciales inválidas" };

function tooManyAttempts(result: RateLimitResult) {
  return NextResponse.json(
    { error: "Demasiados intentos. Intente nuevamente en unos minutos." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}

// Hash ficticio para igualar el costo de verificación cuando el usuario no existe.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("boutique-dummy-password-no-real-user");
  }
  return dummyHashPromise;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipKey = `login:ip:${ip}`;

  try {
    const ipStatus = checkRateLimit(ipKey, IP_LIMIT);
    if (!ipStatus.allowed) return tooManyAttempts(ipStatus);

    const parsedBody = loginSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      recordRateLimitFailure(ipKey, IP_LIMIT);
      return NextResponse.json(CREDENCIALES_INVALIDAS, { status: 400 });
    }

    const { username, password } = parsedBody.data;
    const userKey = `login:user:${ip}:${username.toLowerCase()}`;

    const userStatus = checkRateLimit(userKey, USER_LIMIT);
    if (!userStatus.allowed) {
      recordRateLimitFailure(ipKey, IP_LIMIT);
      return tooManyAttempts(userStatus);
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      await verifyPassword(password, await getDummyHash());
      recordRateLimitFailure(userKey, USER_LIMIT);
      recordRateLimitFailure(ipKey, IP_LIMIT);
      return NextResponse.json(CREDENCIALES_INVALIDAS, { status: 401 });
    }

    const passwordCheck = await verifyPassword(password, user.password);
    if (!passwordCheck.valid) {
      recordRateLimitFailure(userKey, USER_LIMIT);
      recordRateLimitFailure(ipKey, IP_LIMIT);
      return NextResponse.json(CREDENCIALES_INVALIDAS, { status: 401 });
    }
    if (passwordCheck.needsRehash) {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    }

    clearRateLimit(userKey);
    clearRateLimit(ipKey);

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
