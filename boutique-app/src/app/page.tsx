import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";
import { ShoppingCart, Wallet, Package, Users, FileText, Boxes } from "lucide-react";

const modules = [
  { name: "Punto de Venta", href: "/pos", icon: ShoppingCart, description: "Cobrar y emitir comprobantes" },
  { name: "Caja", href: "/caja", icon: Wallet, description: "Apertura, cierre y arqueo" },
  { name: "Productos", href: "/productos", icon: Package, description: "Catálogo, categorías y marcas" },
  { name: "Inventario", href: "/inventario", icon: Boxes, description: "Stock y movimientos" },
  { name: "Clientes", href: "/clientes", icon: Users, description: "Agenda y RUC/CI" },
  { name: "Créditos", href: "/creditos", icon: FileText, description: "Fiados y abonos" },
  { name: "Ventas", href: "/ventas", icon: FileText, description: "Historial y reportes" },
];

export default function Home() {
  return (
    <AppShell>
      <div className="p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="hidden text-2xl font-semibold lg:block" style={{ color: "var(--primary-900)" }}>Inicio</h1>
          <p className="text-sm text-slate-500 lg:mt-1">Elegí un módulo para continuar</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.name}
              href={module.href}
              className="bg-white rounded-lg border p-4 lg:p-6 active:bg-slate-50 hover:border-[var(--primary-200)] transition-colors"
              style={{ borderColor: "var(--primary-100)" }}
            >
              <div className="flex items-start gap-3 lg:gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: "var(--primary-50)" }}>
                  <module.icon className="h-5 w-5" style={{ color: "var(--primary-600)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900">{module.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{module.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
