"use client";

import { Fragment, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Unlock, Lock, ArrowDownToLine, ArrowUpFromLine, FileText, X } from "lucide-react";
import { formatGuarani } from "@/lib/utils";
import { Toaster, toast } from "sonner";

interface CashSession {
  id: string;
  openingAmount: number;
  openedAt: string;
  status: string;
  sales: any[];
  movements: any[];
  user?: { name: string };
  historial?: CashSessionHistorial[];
}

interface CashSessionHistorial {
  id: string;
  openedAt: string;
  closedAt: string | null;
  openingAmount: number;
  closingAmount: number | null;
  expectedAmount: number | null;
  difference: number | null;
  notes: string | null;
  status: string;
  user: { name: string };
  movements: Array<{ type: string; amount: number; concept: string; createdAt: string }>;
  _count: { sales: number };
}

export default function CajaPage() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [historial, setHistorial] = useState<CashSessionHistorial[]>([]);
  const [expandedHistorial, setExpandedHistorial] = useState<string | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [montoApertura, setMontoApertura] = useState("");
  const [showMovimiento, setShowMovimiento] = useState(false);
  const [montoMov, setMontoMov] = useState("");
  const [conceptoMov, setConceptoMov] = useState("");
  const [showCerrar, setShowCerrar] = useState(false);
  const [billetes, setBilletes] = useState<Record<string, string>>({
    "100000": "",
    "50000": "",
    "20000": "",
    "10000": "",
    "5000": "",
    "2000": "",
    "1000": "",
    "500": "",
    "100": "",
    "50": "",
  });

  const fetchSession = () => {
    setLoading(true);
    fetch("/api/caja")
      .then((r) => r.json())
      .then((data) => {
        setSession(data && data.status === "ABIERTA" ? data : null);
        setHistorial(Array.isArray(data?.historial) ? data.historial : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSession();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setEsAdmin(data?.user?.role === "ADMIN"))
      .catch(() => {});
  }, []);

  const abrirCaja = async () => {
    if (!montoApertura) return toast.error("Ingrese el monto inicial");
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "abrir", openingAmount: montoApertura }),
      });
      if (res.ok) {
        toast.success("Caja abierta correctamente");
        setMontoApertura("");
        fetchSession();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al abrir caja");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const reabrirCaja = async () => {
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reabrir" }),
      });
      if (res.ok) {
        toast.success("Caja reabierta con el efectivo contado de la última sesión");
        fetchSession();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al reabrir caja");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  const registrarMovimiento = async () => {
    if (!montoMov || !conceptoMov) return toast.error("Complete todos los campos");
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "egreso", amount: montoMov, concept: conceptoMov }),
      });
      if (res.ok) {
        toast.success("Gasto registrado");
        setShowMovimiento(false);
        setMontoMov("");
        setConceptoMov("");
        fetchSession();
      } else toast.error("Error al registrar gasto");
    } catch {
      toast.error("Error de conexión");
    }
  };

  const totalBilletes = Object.entries(billetes).reduce((sum, [den, qty]) => {
    const n = Number(qty || 0);
    return sum + Number(den) * (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  const cerrarCaja = async () => {
    try {
      const res = await fetch("/api/caja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "cerrar", 
          closingAmount: totalBilletes,
          notes: `Conteo efectivo: ${formatGuarani(totalBilletes)}`
        }),
      });
      if (res.ok) {
        toast.success("Caja cerrada correctamente");
        setShowCerrar(false);
        fetchSession();
      } else toast.error("Error al cerrar caja");
    } catch {
      toast.error("Error de conexión");
    }
  };

  const salesTotal = session?.sales?.reduce((sum: number, s: any) => sum + s.total, 0) || 0;
  const ventasEfectivo = session?.movements?.filter((m: any) => m.type === "INGRESO" && m.concept.startsWith("Venta ")).reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
  const otrosIngresos = session?.movements?.filter((m: any) => m.type === "INGRESO" && !m.concept.startsWith("Venta ")).reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
  const egresos = session?.movements?.filter((m: any) => m.type === "EGRESO").reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
  const expectedEfectivo = (session?.openingAmount || 0) + ventasEfectivo + otrosIngresos - egresos;
  const totalTarjeta = session?.sales?.filter((s: any) => s.paymentMethod === "TARJETA" && s.status !== "ANULADA").reduce((sum: number, s: any) => sum + s.total, 0) || 0;
  const totalTransferencia = session?.sales?.filter((s: any) => s.paymentMethod === "TRANSFERENCIA" && s.status !== "ANULADA").reduce((sum: number, s: any) => sum + s.total, 0) || 0;
  const totalMixto = session?.sales?.filter((s: any) => s.paymentMethod === "MIXTO" && s.status !== "ANULADA").reduce((sum: number, s: any) => sum + s.total, 0) || 0;
  const totalCredito = session?.sales?.filter((s: any) => s.paymentMethod === "CREDITO" && s.status !== "ANULADA").reduce((sum: number, s: any) => sum + s.total, 0) || 0;

  return (
    <AppShell>
      <Toaster position="top-right" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Control de Caja</h1>
          <p className="text-sm text-slate-500 mt-1">Apertura, cierre, arqueo y movimientos</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Cargando...</div>
        ) : !session ? (
          <div className="max-w-md mx-auto lg:mx-0">
            <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-50)]">
                  <Unlock className="h-5 w-5 text-[var(--primary-600)]" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-slate-900">Abrir Caja</h2>
                  <p className="text-sm text-slate-500">Ingrese el monto inicial</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Monto Inicial (₲)</label>
                  <input
                    type="number"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                    placeholder="0"
                    className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)] focus:border-[var(--primary-600)]"
                  />
                </div>
                <button onClick={abrirCaja} className="min-h-11 w-full rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                  Abrir Caja
                </button>
                {esAdmin && historial.length > 0 && (
                  <button onClick={reabrirCaja} className="min-h-11 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Reabrir última caja ({formatGuarani(historial[0].closingAmount ?? historial[0].expectedAmount ?? 0)})
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-50">
                <Lock className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">Caja Abierta</div>
                <div className="text-sm text-slate-500">Abierta el {new Date(session.openedAt).toLocaleString("es-PY")}</div>
              </div>
              <button onClick={() => { setBilletes({ "100000": "", "50000": "", "20000": "", "10000": "", "5000": "", "2000": "", "1000": "", "500": "", "100": "", "50": "" }); setShowCerrar(true); }} className="min-h-11 w-full justify-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">
                Cerrar Caja
              </button>
            </div>

            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Monto Inicial</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(session.openingAmount)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Ventas</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(salesTotal)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Otros Ingresos</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-green-600 mt-1">{formatGuarani(otrosIngresos)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Gastos</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-red-600 mt-1">{formatGuarani(egresos)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Efectivo Esperado</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-[var(--primary-600)] mt-1">{formatGuarani(expectedEfectivo)}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Efectivo</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(ventasEfectivo)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Tarjeta</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(totalTarjeta)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Transferencia</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(totalTransferencia)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Mixto</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(totalMixto)}</p>
              </div>
              <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-xs sm:text-sm text-slate-500">Crédito</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(totalCredito)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowMovimiento(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <ArrowUpFromLine className="h-4 w-4 shrink-0" />
                Registrar gasto
              </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200">
                <h2 className="font-medium text-slate-900">Movimientos</h2>
              </div>
              {/* Vista móvil */}
              <div className="lg:hidden divide-y divide-slate-200">
                {session.movements?.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Sin movimientos</p>
                  </div>
                ) : (
                  session.movements?.map((m: any) => (
                    <div key={m.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm text-slate-900">{m.concept}</span>
                        <span className="shrink-0 text-sm font-medium text-slate-900">{formatGuarani(m.amount)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs text-slate-500">{new Date(m.createdAt).toLocaleTimeString("es-PY")}</span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${m.type === "INGRESO" || m.type === "APERTURA" ? "bg-green-50 text-green-700" : m.type === "EGRESO" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{m.type}</span>
                        <span className="min-w-0 truncate text-xs text-slate-500">Usuario: {session.user?.name || "-"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Vista desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Hora</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Concepto</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {session.movements?.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-8 text-center"><FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" /><p className="text-sm text-slate-500">Sin movimientos</p></td></tr>
                    ) : (
                      session.movements?.map((m: any) => (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-600">{new Date(m.createdAt).toLocaleTimeString("es-PY")}</td>
                          <td className="px-6 py-4 text-sm"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${m.type === "INGRESO" || m.type === "APERTURA" ? "bg-green-50 text-green-700" : m.type === "EGRESO" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>{m.type}</span></td>
                          <td className="px-6 py-4 text-sm text-slate-900">{m.concept}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 text-right">{formatGuarani(m.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200">
            <div className="min-w-0">
              <h2 className="font-medium text-slate-900">Historial de cajas</h2>
              <p className="text-xs text-slate-500 mt-0.5">Últimas {historial.length} sesiones cerradas</p>
            </div>
            <span className="hidden text-xs text-slate-500 sm:inline">Clic en una fila para ver el detalle</span>
          </div>
          {historial.length === 0 ? (
            <div className="px-4 py-8 text-center sm:px-6">
              <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500">Todavía no hay cajas cerradas</p>
            </div>
          ) : (
            <>
              {/* Vista móvil */}
              <div className="lg:hidden divide-y divide-slate-200">
                {historial.map((h, index) => (
                  <div key={h.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setExpandedHistorial(expandedHistorial === h.id ? null : h.id)}
                      aria-expanded={expandedHistorial === h.id}
                      className="flex min-h-11 w-full items-start justify-between gap-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{new Date(h.openedAt).toLocaleString("es-PY")}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{h.user?.name || "-"} · {h._count?.sales ?? 0} ventas</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{h.status}</span>
                    </button>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">Cierre</dt>
                        <dd className="truncate text-slate-700">{h.closedAt ? new Date(h.closedAt).toLocaleString("es-PY") : "-"}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">Efectivo apertura</dt>
                        <dd className="truncate text-slate-700">{formatGuarani(h.openingAmount ?? 0)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">Efectivo cierre</dt>
                        <dd className="truncate font-medium text-slate-900">{formatGuarani(h.closingAmount ?? 0)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-slate-500">Total (esperado)</dt>
                        <dd className="truncate text-slate-700">{formatGuarani(h.expectedAmount ?? 0)}</dd>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <dt className="text-xs text-slate-500">Diferencia</dt>
                        <dd className={`truncate font-medium ${(h.difference ?? 0) === 0 ? "text-green-600" : "text-amber-600"}`}>
                          {formatGuarani(h.difference ?? 0)}
                        </dd>
                      </div>
                    </dl>
                    {expandedHistorial === h.id && (
                      <div className="mt-3 space-y-3 rounded-md bg-slate-50 p-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Notas del cierre</p>
                          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{h.notes || "Sin notas"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase mb-1">Movimientos ({h.movements?.length || 0})</p>
                          <div className="max-h-48 space-y-1 overflow-y-auto">
                            {(h.movements || []).map((m, index) => (
                              <div key={index} className="flex justify-between gap-3 text-sm">
                                <span className="min-w-0 text-slate-600">
                                  <span className="mr-2 text-xs text-slate-400">{new Date(m.createdAt).toLocaleTimeString("es-PY")}</span>
                                  {m.type} · {m.concept}
                                </span>
                                <span className="shrink-0 font-medium text-slate-900">{formatGuarani(m.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {esAdmin && !session && index === 0 && (
                      <button onClick={reabrirCaja} className="mt-3 min-h-11 w-full rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Reabrir última caja
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {/* Vista desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Apertura</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cierre</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Ventas</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Esperado</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Contado</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Diferencia</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {historial.map((h) => (
                      <Fragment key={h.id}>
                        <tr
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => setExpandedHistorial(expandedHistorial === h.id ? null : h.id)}
                        >
                          <td className="px-4 py-3 text-sm text-slate-600">{new Date(h.openedAt).toLocaleString("es-PY")}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{h.closedAt ? new Date(h.closedAt).toLocaleString("es-PY") : "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{h.user?.name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">{h._count?.sales ?? 0}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-900">{formatGuarani(h.expectedAmount ?? 0)}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-slate-900">{formatGuarani(h.closingAmount ?? 0)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${(h.difference ?? 0) === 0 ? "text-green-600" : "text-amber-600"}`}>
                            {formatGuarani(h.difference ?? 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 max-w-[220px] truncate">{h.notes || "-"}</td>
                        </tr>
                        {expandedHistorial === h.id && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Notas del cierre</p>
                                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{h.notes || "Sin notas"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Movimientos ({h.movements?.length || 0})</p>
                                  <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {(h.movements || []).map((m, index) => (
                                      <div key={index} className="flex justify-between gap-4 text-sm">
                                        <span className="text-slate-600">
                                          <span className="text-xs text-slate-400 mr-2">{new Date(m.createdAt).toLocaleTimeString("es-PY")}</span>
                                          {m.type} · {m.concept}
                                        </span>
                                        <span className="font-medium text-slate-900 whitespace-nowrap">{formatGuarani(m.amount)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showMovimiento && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-medium text-slate-900">Registrar gasto</h2>
              <button onClick={() => setShowMovimiento(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monto (₲)</label>
                <input type="number" value={montoMov} onChange={(e) => setMontoMov(e.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Concepto</label>
                <input type="text" value={conceptoMov} onChange={(e) => setConceptoMov(e.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">
              <button onClick={() => setShowMovimiento(false)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={registrarMovimiento} className="min-h-11 flex-1 rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Registrar gasto</button>
            </div>
          </div>
        </div>
      )}

      {showCerrar && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-medium text-slate-900">Cerrar Caja</h2>
              <button onClick={() => setShowCerrar(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0 bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-medium text-slate-900 mb-2">Efectivo en caja</div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">Monto Inicial</span><span className="shrink-0 font-medium">{formatGuarani(session?.openingAmount ?? 0)}</span></div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">+ Ventas en efectivo</span><span className="shrink-0 font-medium">{formatGuarani(ventasEfectivo)}</span></div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">+ Otros ingresos</span><span className="shrink-0 font-medium">{formatGuarani(otrosIngresos)}</span></div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">- Gastos</span><span className="shrink-0 font-medium">{formatGuarani(egresos)}</span></div>
                  <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-200"><span className="min-w-0 font-medium">Efectivo esperado</span><span className="shrink-0 font-semibold text-[var(--primary-600)]">{formatGuarani(expectedEfectivo)}</span></div>
                </div>
                <div className="min-w-0 bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-medium text-slate-900 mb-2">Otras formas de pago</div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">Tarjeta</span><span className="shrink-0 font-medium">{formatGuarani(totalTarjeta)}</span></div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">Transferencia</span><span className="shrink-0 font-medium">{formatGuarani(totalTransferencia)}</span></div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">Mixto</span><span className="shrink-0 font-medium">{formatGuarani(totalMixto)}</span></div>
                  <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-600">Crédito</span><span className="shrink-0 font-medium">{formatGuarani(totalCredito)}</span></div>
                  <div className="flex items-start justify-between gap-2 pt-2 border-t border-slate-200"><span className="min-w-0 font-medium">Total ventas</span><span className="shrink-0 font-semibold">{formatGuarani(salesTotal)}</span></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Conteo de efectivo (cantidad de billetes/monedas)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    ["100000", "100.000"],
                    ["50000", "50.000"],
                    ["20000", "20.000"],
                    ["10000", "10.000"],
                    ["5000", "5.000"],
                    ["2000", "2.000"],
                    ["1000", "1.000"],
                    ["500", "500"],
                    ["100", "100"],
                    ["50", "50"],
                  ].map(([den, label]) => (
                    <div key={den} className="min-w-0 bg-slate-50 rounded-md p-2">
                      <div className="text-xs text-slate-500 mb-1">₲ {label}</div>
                      <input
                        type="number"
                        min="0"
                        value={billetes[den]}
                        onChange={(e) => setBilletes((prev) => ({ ...prev, [den]: e.target.value }))}
                        className="min-h-11 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-md p-3">
                  <span className="min-w-0 text-sm text-slate-600">Total contado en efectivo</span>
                  <span className="shrink-0 text-lg font-semibold text-slate-900">{formatGuarani(totalBilletes)}</span>
                </div>
                <div className="mt-2 flex items-start justify-between gap-2 text-sm">
                  <span className="min-w-0 text-slate-600">Diferencia vs esperado</span>
                  <span className={`shrink-0 font-medium ${totalBilletes - expectedEfectivo === 0 ? "text-green-600" : "text-amber-600"}`}>
                    {formatGuarani(totalBilletes - expectedEfectivo)}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">
              <button onClick={() => setShowCerrar(false)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={cerrarCaja} className="min-h-11 flex-1 rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Cerrar Caja</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
