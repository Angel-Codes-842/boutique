"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayout } from "./layout-context";
import { bottomNavItems, isNavActive, navForRole } from "./navigation";

export function BottomNav() {
  const pathname = usePathname();
  const { user, menuOpen, openMenu } = useLayout();
  const slots = bottomNavItems(user?.role ?? null);
  const allItems = navForRole(user?.role ?? null);
  const hasMore = allItems.length > slots.length;
  const primaryHrefs = new Set(slots.map((item) => item.href));
  const moreActive = allItems.some(
    (item) => !primaryHrefs.has(item.href) && isNavActive(pathname, item.href)
  );

  return (
    <nav
      className="flex shrink-0 border-t border-[var(--primary-100)] bg-white lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {slots.map((item) => {
        const active = isNavActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium",
              active ? "text-[var(--primary-600)]" : "text-slate-500"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="truncate max-w-full">{item.name === "Punto de Venta" ? "POS" : item.name}</span>
          </Link>
        );
      })}
      {hasMore && (
        <button
          type="button"
          onClick={openMenu}
          className={cn(
            "flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium",
            menuOpen || moreActive ? "text-[var(--primary-600)]" : "text-slate-500"
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>Más</span>
        </button>
      )}
    </nav>
  );
}
