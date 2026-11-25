import {
  LayoutDashboard,
  ShoppingCart,
  Wallet,
  Package,
  Boxes,
  Users,
  FileText,
  Settings,
  BarChart3,
  FileCheck2,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { name: "Inicio", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "CAJERO", "VENDEDOR", "ALMACEN"] },
  { name: "Punto de Venta", href: "/pos", icon: ShoppingCart, roles: ["ADMIN", "CAJERO", "VENDEDOR"] },
  { name: "Caja", href: "/caja", icon: Wallet, roles: ["ADMIN", "CAJERO"] },
  { name: "Productos", href: "/productos", icon: Package, roles: ["ADMIN", "ALMACEN"] },
  { name: "Inventario", href: "/inventario", icon: Boxes, roles: ["ADMIN", "ALMACEN"] },
  { name: "Clientes", href: "/clientes", icon: Users, roles: ["ADMIN", "CAJERO", "VENDEDOR"] },
  { name: "Créditos", href: "/creditos", icon: FileText, roles: ["ADMIN", "CAJERO"] },
  { name: "Ventas", href: "/ventas", icon: FileText, roles: ["ADMIN", "CAJERO"] },
  { name: "Facturación", href: "/facturacion", icon: FileCheck2, roles: ["ADMIN", "CAJERO"] },
  { name: "Reportes", href: "/reportes", icon: BarChart3, roles: ["ADMIN"] },
  { name: "Configuración", href: "/configuracion", icon: Settings, roles: ["ADMIN"] },
];

export const PAGE_TITLES: Record<string, string> = {
  "/": "Inicio",
  "/pos": "Punto de Venta",
  "/caja": "Caja",
  "/productos": "Productos",
  "/inventario": "Inventario",
  "/clientes": "Clientes",
  "/creditos": "Créditos",
  "/ventas": "Ventas",
  "/facturacion": "Facturación electrónica",
  "/reportes": "Reportes",
  "/configuracion": "Configuración",
};

export function navForRole(role: string | null): NavItem[] {
  if (!role) return NAV_ITEMS;
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES)
    .filter((key) => key !== "/" && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : "Boutique POS";
}

/** Accesos rápidos de la barra inferior (máx. 3) + botón Más. */
export function bottomNavItems(role: string | null): NavItem[] {
  const items = navForRole(role);
  const pick = (href: string) => items.find((item) => item.href === href);

  const slots: NavItem[] = [];
  const inicio = pick("/");
  const pos = pick("/pos");
  const caja = pick("/caja");
  const productos = pick("/productos");
  const inventario = pick("/inventario");
  const clientes = pick("/clientes");

  if (inicio) slots.push(inicio);
  if (pos) slots.push(pos);
  else if (productos) slots.push(productos);

  if (caja) slots.push(caja);
  else if (inventario) slots.push(inventario);
  else if (clientes) slots.push(clientes);

  return slots.slice(0, 3);
}
