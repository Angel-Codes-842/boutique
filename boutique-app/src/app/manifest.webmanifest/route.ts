import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    id: "/",
    name: "Boutique POS",
    short_name: "Boutique",
    description: "Sistema de Punto de Venta, Caja, Inventario y Créditos",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["business", "productivity"],
    shortcuts: [
      { name: "Punto de Venta", short_name: "POS", url: "/pos" },
      { name: "Caja", short_name: "Caja", url: "/caja" },
    ],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
