import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth/session-token";

type SessionUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
};

export async function getSessionFromToken(token: string | undefined) {
  const sessionId = await verifySessionToken(token);
  if (!sessionId) return null;

  return prisma.user.findFirst({
    where: { id: sessionId, active: true },
    select: { id: true, name: true, username: true, role: true, active: true },
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  return getSessionFromToken(cookieStore.get("boutique_session")?.value);
}

export async function authorizeApiRequest(
  allowedRoles?: readonly Role[],
  sessionToken?: string | null
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = sessionToken !== undefined
    ? await getSessionFromToken(sessionToken ?? undefined)
    : await getSession();
  if (!user) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { response: NextResponse.json({ error: "Sin permisos" }, { status: 403 }) };
  }
  return { user };
}
