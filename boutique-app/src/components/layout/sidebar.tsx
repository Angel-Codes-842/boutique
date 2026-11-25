"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayout } from "./layout-context";
import { isNavActive, navForRole } from "./navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { user, menuOpen, closeMenu } = useLayout();
  const filteredNav = navForRole(user?.role ?? null);

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={closeMenu}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--primary-100)] bg-white transition-transform duration-200 ease-out",
          "lg:static lg:z-auto lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--primary-100)] lg:h-16 lg:px-6">
          <h1 className="text-lg font-semibold text-[var(--primary-600)]">Boutique POS</h1>
          <button
            type="button"
            onClick={closeMenu}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-50 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {filteredNav.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                onClick={closeMenu}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "text-white bg-[var(--primary-600)]"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--primary-100)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:pb-4">
          <div className="text-xs text-slate-500">Sistema de Facturación</div>
          <div className="text-xs text-slate-400 mt-1">Paraguay - Guaraníes</div>
        </div>
      </aside>
    </>
  );
}
