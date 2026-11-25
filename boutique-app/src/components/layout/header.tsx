"use client";

import { useState } from "react";
import { Menu, User, LogOut, KeyRound, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLayout } from "./layout-context";
import { pageTitle } from "./navigation";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, menuOpen, toggleMenu } = useLayout();
  const title = pageTitle(pathname);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const logout = async () => {
    await fetch("/api/auth/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "No se pudo cambiar la contraseña.");
      return;
    }
    toast.success("Contraseña actualizada.");
    setCurrentPassword("");
    setNewPassword("");
    setPasswordDialogOpen(false);
  };

  return (
    <>
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--primary-100)] bg-white px-3 lg:h-16 lg:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={toggleMenu}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-50 lg:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="truncate text-sm font-medium text-slate-900 lg:text-sm">{title}</h2>
      </div>
      <div className="flex items-center gap-1 lg:gap-3">
        <div className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-[var(--primary-50)] px-2 lg:px-3">
          <User className="h-4 w-4 text-[var(--primary-600)]" />
          <span className="hidden text-sm font-medium text-[var(--primary-700)] sm:inline">
            {user?.name || "Usuario"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPasswordDialogOpen(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-50"
          title="Cambiar contraseña"
          aria-label="Cambiar contraseña"
        >
          <KeyRound className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={logout}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-50"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
    {passwordDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
        <form onSubmit={changePassword} className="max-h-[90dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-w-md sm:rounded-2xl sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
            <button type="button" onClick={() => setPasswordDialogOpen(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña actual
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Nueva contraseña (mínimo 12 caracteres)
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3"
            />
          </label>
          <button type="submit" className="min-h-11 w-full rounded-md bg-[var(--primary-600)] px-4 font-medium text-white">
            Guardar contraseña
          </button>
        </form>
      </div>
    )}
    </>
  );
}
