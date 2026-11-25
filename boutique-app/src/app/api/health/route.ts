import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (new URL(request.url).pathname !== "/api/health") {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
