"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Package, AlertTriangle, ArrowUpDown, Search, X, Plus, Minus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  minStock: number;
  trackStock: boolean;
  category?: { name: string };
  variants?: { id: string; stock: number; code: string }[];
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason?: string;
  reference?: string;
  createdAt: string;
  product: { name: string; code: string };
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [movimientos, setMovimientos] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showMovimientos, setShowMovimientos] = useState(false);
  const [showAjuste, setShowAjuste] = useState(false);
  const [tipoAjuste, setTipoAjuste] = useState<"ENTRADA" | "SALIDA" | "AJUSTE">("ENTRADA");
  const [productoSeleccionado, setProductoSeleccionado] = useState<Product | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/productos").then((r) => r.json()),
      fetch("/api/inventario/movimientos").then((r) => r.json()).catch(() => []),
    ])
      .then(([prods, movs]) => {
        setProductos(Array.isArray(prods) ? prods : []);
        setMovimientos(Array.isArray(movs) ? movs : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const getStock = (p: Product) => {
    if (p.variants && p.variants.length > 0) {
      return p.variants.reduce((sum, v) => sum + v.stock, 0);
    }
    return (p as any).stock || 0;
  };

  const filtered = productos.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalProductos = productos.length;
  const stockBajo = productos.filter((p) => p.trackStock && getStock(p) <= p.minStock && p.minStock > 0).length;
  const totalMovimientos = movimientos.length;

  const abrirAjuste = (p: Product, tipo: "ENTRADA" | "SALIDA" | "AJUSTE") => {
    setProductoSeleccionado(p);
    setTipoAjuste(tipo);
    setCantidad("");
    setMotivo("");
    setShowAjuste(true);
  };

  const guardarAjuste = async () => {
    if (!productoSeleccionado || !cantidad) {
      toast.error("Complete los campos requeridos");
      return;
    }
    try {
      const res = await fetch("/api/inventario/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productoSeleccionado.id,
          type: tipoAjuste,
          quantity: Number(cantidad),
          reason: motivo || `Ajuste ${tipoAjuste}`,
        }),
      });
      if (res.ok) {
        toast.success("Ajuste de stock registrado");
        setShowAjuste(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al registrar ajuste");
      }
    } catch {
      toast.error("Error de conexion");
    }
  };

  const tipoColor = (tipo: string) => {
    if (tipo === "ENTRADA" || tipo === "VENTA") return "bg-green-50 text-green-700";
    if (tipo === "SALIDA") return "bg-red-50 text-red-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <AppShell>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 lg:mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Inventario</h1>
            <p className="text-sm text-slate-500 mt-0.5">Control de stock y movimientos</p>
          </div>
          <button onClick={() => setShowMovimientos(true)} aria-label="Ver movimientos" className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <ArrowUpDown className="h-4 w-4" />
            <span className="hidden sm:inline">Movimientos</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-50)]">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--primary-600)]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">Productos</p>
                <p className="w-full min-w-0 truncate text-lg font-semibold text-slate-900 sm:text-2xl">{totalProductos}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md bg-amber-50">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">Stock Bajo</p>
                <p className="w-full min-w-0 truncate text-lg font-semibold text-slate-900 sm:text-2xl">{stockBajo}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <ArrowUpDown className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">Movimientos</p>
                <p className="w-full min-w-0 truncate text-lg font-semibold text-slate-900 sm:text-2xl">{totalMovimientos}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 mb-4 lg:mb-6">
          <div className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 sm:px-4 lg:px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-medium text-slate-900">Stock Actual</h2>
          </div>
          <div className="lg:hidden divide-y divide-slate-200">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No hay productos</div>
            ) : (
              filtered.map((producto) => {
                const stock = getStock(producto);
                const bajo = producto.trackStock && producto.minStock > 0 && stock <= producto.minStock;
                return (
                  <div key={producto.id} className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{producto.name}</p>
                        <p className="text-xs font-mono text-slate-500">{producto.code}</p>
                        {producto.category && <p className="text-xs text-slate-400 mt-0.5">{producto.category.name}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-semibold ${bajo ? "text-amber-600" : "text-slate-900"}`}>{stock}</p>
                        <p className="text-xs text-slate-400">min: {producto.minStock}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {bajo ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700">
                          <AlertTriangle className="h-3 w-3" />Stock bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">Normal</span>
                      )}
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirAjuste(producto, "ENTRADA")} aria-label={`Entrada de stock de ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100">
                          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Entrada</span>
                        </button>
                        <button onClick={() => abrirAjuste(producto, "SALIDA")} aria-label={`Salida de stock de ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-2 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100">
                          <Minus className="h-4 w-4" /><span className="hidden sm:inline">Salida</span>
                        </button>
                        <button onClick={() => abrirAjuste(producto, "AJUSTE")} aria-label={`Ajustar stock de ${producto.name}`} className="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Codigo</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Actual</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Minimo</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">Cargando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">No hay productos</td></tr>
                ) : (
                  filtered.map((producto) => {
                    const stock = getStock(producto);
                    const bajo = producto.trackStock && producto.minStock > 0 && stock <= producto.minStock;
                    return (
                      <tr key={producto.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-mono text-slate-900">{producto.code}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{producto.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{producto.category?.name || "-"}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{stock}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-right">{producto.minStock}</td>
                        <td className="px-6 py-4">
                          {bajo ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-amber-50 text-amber-700">
                              <AlertTriangle className="h-3 w-3" />Stock Bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700">Normal</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => abrirAjuste(producto, "ENTRADA")} className="min-h-11 text-xs px-2 rounded-md bg-green-50 text-green-700 hover:bg-green-100">Entrada</button>
                            <button onClick={() => abrirAjuste(producto, "SALIDA")} className="min-h-11 text-xs px-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100">Salida</button>
                            <button onClick={() => abrirAjuste(producto, "AJUSTE")} className="min-h-11 text-xs px-2 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200">Ajuste</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showMovimientos && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-white sm:max-w-3xl sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-6">
              <h2 className="min-w-0 truncate text-base font-medium text-slate-900 sm:text-lg">Historial de Movimientos</h2>
              <button onClick={() => setShowMovimientos(false)} aria-label="Cerrar movimientos" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="min-h-[180px] flex-1 overflow-y-auto sm:hidden divide-y divide-slate-200">
              {movimientos.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Sin movimientos</div>
              ) : (
                movimientos.map((m) => (
                  <div key={m.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleString("es-PY")}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor(m.type)}`}>{m.type}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{m.product.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-500">{m.reason || "-"}</p>
                      <p className={`text-sm font-semibold ${Number(m.quantity) > 0 ? "text-green-600" : "text-red-600"}`}>{m.quantity > 0 ? "+" : ""}{m.quantity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="hidden min-h-[180px] flex-1 overflow-auto sm:block">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Producto</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Motivo</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">Sin movimientos</td></tr>
                  ) : (
                    movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(m.createdAt).toLocaleString("es-PY")}</td>
                        <td className="px-6 py-4 text-sm text-slate-900">{m.product.name} <span className="text-slate-500">({m.product.code})</span></td>
                        <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${tipoColor(m.type)}`}>{m.type}</span></td>
                        <td className="px-6 py-4 text-sm text-slate-600">{m.reason || "-"}</td>
                        <td className={`px-6 py-4 text-sm font-medium text-right ${Number(m.quantity) > 0 ? "text-green-600" : "text-red-600"}`}>{m.quantity > 0 ? "+" : ""}{m.quantity}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAjuste && productoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-6">
              <h2 className="min-w-0 truncate text-base font-medium text-slate-900 sm:text-lg">
                {tipoAjuste === "ENTRADA" ? "Entrada de Mercaderia" : tipoAjuste === "SALIDA" ? "Salida de Mercaderia" : "Ajuste de Stock"}
              </h2>
              <button onClick={() => setShowAjuste(false)} aria-label="Cerrar ajuste" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div className="min-w-0 rounded-md bg-slate-50 p-3">
                <p className="truncate text-sm font-medium text-slate-900">{productoSeleccionado.name}</p>
                <p className="truncate text-xs text-slate-500 font-mono">{productoSeleccionado.code}</p>
                <p className="text-xs text-slate-400 mt-1">Stock actual: <span className="font-medium text-slate-700">{getStock(productoSeleccionado)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad</label>
                <input type="number" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo</label>
                <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Compra, Dano, Conteo..." className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-4 py-3 sm:px-6">
              <button onClick={() => setShowAjuste(false)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarAjuste} className="min-h-11 flex-1 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}