const fs = require('fs');
const path = require('path');

const clientesContent = `"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Plus, Search, Pencil, X, User, Phone, FileText, Mail } from "lucide-react";
import { toast } from "sonner";

interface Cliente {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  address?: string;
  debt?: number;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState({ name: "", document: "", phone: "", email: "", address: "" });

  const fetchData = () => {
    setLoading(true);
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => {
        setClientes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", document: "", phone: "", email: "", address: "" });
    setShowModal(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({ name: c.name, document: c.document || "", phone: c.phone || "", email: c.email || "", address: c.address || "" });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    try {
      if (editing) {
        const res = await fetch(\`/api/clientes/\${editing.id}\`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) { toast.success("Cliente actualizado"); setShowModal(false); fetchData(); }
        else toast.error("Error al actualizar");
      } else {
        const res = await fetch("/api/clientes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        if (res.ok) { toast.success("Cliente creado"); setShowModal(false); fetchData(); }
        else toast.error("Error al crear");
      }
    } catch { toast.error("Error de conexion"); }
  };

  const filtered = clientes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.document && c.document.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  return (
    <AppShell>
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Header */}
        <div className="mb-4 lg:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Clientes</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gestion de clientes</p>
          </div>
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-md bg-[var(--primary-600)] px-3 sm:px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo cliente</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-lg border border-slate-200 mb-4 lg:mb-6">
          <div className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar por nombre, RUC/CI o telefono..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-slate-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Vista movil - cards */}
          <div className="lg:hidden divide-y divide-slate-200">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <User className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No hay clientes</p>
              </div>
            ) : (
              filtered.map((cliente) => (
                <div key={cliente.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{cliente.name}</p>
                      {cliente.document && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-500 truncate">{cliente.document}</p>
                        </div>
                      )}
                      {cliente.phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-500">{cliente.phone}</p>
                        </div>
                      )}
                      {cliente.email && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-500 truncate">{cliente.email}</p>
                        </div>
                      )}
                      {(cliente.debt ?? 0) > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">Deuda pendiente</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => openEdit(cliente)} className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista desktop - tabla */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">RUC/CI</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Telefono</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Correo</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Direccion</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">No hay clientes</td></tr>
                ) : (
                  filtered.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{cliente.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cliente.document || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cliente.phone || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cliente.email || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cliente.address || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEdit(cliente)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal - bottom sheet en movil */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200">
              <h2 className="text-base sm:text-lg font-medium text-slate-900">{editing ? "Editar Cliente" : "Nuevo Cliente"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre / Razon Social *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">RUC / CI</label>
                  <input type="text" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefono</label>
                  <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo Electronico</label>
                <input type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Direccion</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
            </div>
            <div className="flex gap-2 px-4 sm:px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={save} className="flex-1 rounded-md bg-[var(--primary-600)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
`;

fs.writeFileSync(path.join('src/app/clientes/page.tsx'), clientesContent, 'utf8');
console.log('clientes written:', clientesContent.length);
