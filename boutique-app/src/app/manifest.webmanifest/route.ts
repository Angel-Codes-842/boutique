import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    name: "Boutique POS",
    short_name: "Boutique",
    description: "Sistema de Punto de Venta, Caja, Inventario y Créditos",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
