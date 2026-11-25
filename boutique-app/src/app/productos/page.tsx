"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { formatGuarani } from "@/lib/utils";
import { Toaster, toast } from "sonner";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  minStock: number;
  categoryId?: string;
  brandId?: string;
  category?: { name: string };
  brand?: { name: string };
  active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [marcas, setMarcas] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    price: "",
    cost: "",
    minStock: "",
    categoryId: "",
    brandId: "",
  });

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/productos").then((r) => r.json()),
      fetch("/api/categorias").then((r) => r.json()),
      fetch("/api/marcas").then((r) => r.json()),
    ])
      .then(([prods, cats, brands]) => {
        setProductos(Array.isArray(prods) ? prods : []);
        setCategorias(Array.isArray(cats) ? cats : []);
        setMarcas(Array.isArray(brands) ? brands : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ code: "", name: "", price: "", cost: "", minStock: "", categoryId: "", brandId: "" });
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      code: p.code,
      name: p.name,
      price: String(p.price),
      cost: String(p.cost),
      minStock: String(p.minStock),
      categoryId: p.categoryId || "",
      brandId: p.brandId || "",
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.code || !form.name || !form.price) {
      toast.error("Código, nombre y precio son obligatorios");
      return;
    }
    try {
      if (editing) {
        const res = await fetch(`/api/productos/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          toast.success("Producto actualizado");
          setShowModal(false);
          fetchData();
        } else toast.error("Error al actualizar");
      } else {
        const res = await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          toast.success("Producto creado");
          setShowModal(false);
          fetchData();
        } else toast.error("Error al crear");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      const res = await fetch(`/api/productos/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Producto eliminado");
        fetchData();
      } else toast.error("Error al eliminar");
    } catch {
      toast.error("Error de conexión");
    }
  };

  const filtered = productos.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <Toaster position="top-right" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Productos</h1>
            <p className="text-sm text-slate-500 mt-1">Gestión de catálogo de productos</p>
          </div>
          <button onClick={openNew} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90">
            <Plus className="h-4 w-4" />
            Nuevo producto
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 mb-4 lg:mb-6">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-11 w-full rounded-md border border-slate-300 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)] focus:border-[var(--primary-600)]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="lg:hidden divide-y divide-slate-200">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No hay productos</div>
            ) : (
              filtered.map((producto) => (
                <div key={producto.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900">{producto.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{producto.code}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{producto.category?.name || "Sin categoría"}</div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-semibold text-slate-900">{formatGuarani(producto.price)}</div>
                      <div className="text-xs text-slate-500">Costo: {formatGuarani(producto.cost)}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">Activo</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(producto)} aria-label={`Editar ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(producto.id)} aria-label={`Eliminar ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="hidden lg:block">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Producto</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Categoría</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Precio Venta</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Costo</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Mínimo</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-500">No hay productos</td></tr>
              ) : (
                filtered.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-mono text-slate-900">{producto.code}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{producto.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{producto.category?.name || "-"}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{formatGuarani(producto.price)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{formatGuarani(producto.cost)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 text-right">{producto.minStock}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700">Activo</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(producto)} aria-label={`Editar ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(producto.id)} aria-label={`Eliminar ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <h2 className="min-w-0 truncate text-lg font-medium text-slate-900">{editing ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setShowModal(false)} aria-label="Cerrar formulario" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Código *</label>
                  <input type="text" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Precio Venta (₲) *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Costo (₲)</label>
                  <input type="number" value={form.cost} onChange={(e) => setForm({...form, cost: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stock Mínimo</label>
                  <input type="number" value={form.minStock} onChange={(e) => setForm({...form, minStock: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Categoría</label>
                  <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]">
                    <option value="">Sin categoría</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Marca</label>
                  <select value={form.brandId} onChange={(e) => setForm({...form, brandId: e.target.value})} className="min-h-11 w-full min-w-0 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]">
                    <option value="">Sin marca</option>
                    {marcas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">
              <button onClick={() => setShowModal(false)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={save} className="min-h-11 flex-1 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
