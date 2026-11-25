import { NextResponse, connection } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  await connection(); // request-time: evitar prerender/cache con Cache Components
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ 
      user: { id: session.id, name: session.name, username: session.username, role: session.role } 
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
