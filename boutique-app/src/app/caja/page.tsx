"use client";

import { useEffect, useState } from "react";
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
}

export default function CajaPage() {
  const [session, setSession] = useState<CashSession | null>(null);
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
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchSession();
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
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--primary-50)]">
                  <Unlock className="h-5 w-5 text-[var(--primary-600)]" />
                </div>
                <div>
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
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)] focus:border-[var(--primary-600)]"
                  />
                </div>
                <button onClick={abrirCaja} className="w-full rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">
                  Abrir Caja
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-50">
                <Lock className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">Caja Abierta</div>
                <div className="text-sm text-slate-500">Abierta el {new Date(session.openedAt).toLocaleString("es-PY")}</div>
              </div>
              <button onClick={() => { setBilletes({ "100000": "", "50000": "", "20000": "", "10000": "", "5000": "", "2000": "", "1000": "", "500": "", "100": "", "50": "" }); setShowCerrar(true); }} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cerrar Caja
              </button>
            </div>

            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-sm text-slate-500">Monto Inicial</p>
                <p className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 mt-1">{formatGuarani(session.openingAmount)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-sm text-slate-500">Ventas</p>
                <p className="text-base sm:text-lg lg:text-xl font-semibold text-slate-900 mt-1">{formatGuarani(salesTotal)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-sm text-slate-500">Otros Ingresos</p>
                <p className="text-base sm:text-lg lg:text-xl font-semibold text-green-600 mt-1">{formatGuarani(otrosIngresos)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-sm text-slate-500">Gastos</p>
                <p className="text-base sm:text-lg lg:text-xl font-semibold text-red-600 mt-1">{formatGuarani(egresos)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
                <p className="text-sm text-slate-500">Efectivo Esperado</p>
                <p className="text-base sm:text-lg lg:text-xl font-semibold text-[var(--primary-600)] mt-1">{formatGuarani(expectedEfectivo)}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
                <p className="text-xs text-slate-500">Efectivo</p>
                <p className="text-lg font-semibold text-slate-900">{formatGuarani(ventasEfectivo)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
                <p className="text-xs text-slate-500">Tarjeta</p>
                <p className="text-lg font-semibold text-slate-900">{formatGuarani(totalTarjeta)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Transferencia</p>
                <p className="text-lg font-semibold text-slate-900">{formatGuarani(totalTransferencia)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Mixto</p>
                <p className="text-lg font-semibold text-slate-900">{formatGuarani(totalMixto)}</p>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <p className="text-xs text-slate-500">Crédito</p>
                <p className="text-lg font-semibold text-slate-900">{formatGuarani(totalCredito)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowMovimiento(true); }} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <ArrowUpFromLine className="h-4 w-4" />
                Registrar gasto
              </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-medium text-slate-900">Movimientos</h2>
              </div>
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
        )}
      </div>

      {showMovimiento && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Registrar gasto</h2>
              <button onClick={() => setShowMovimiento(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monto (₲)</label>
                <input type="number" value={montoMov} onChange={(e) => setMontoMov(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Concepto</label>
                <input type="text" value={conceptoMov} onChange={(e) => setConceptoMov(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowMovimiento(false)} className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={registrarMovimiento} className="flex-1 rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Registrar gasto</button>
            </div>
          </div>
        </div>
      )}

      {showCerrar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Cerrar Caja</h2>
              <button onClick={() => setShowCerrar(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-medium text-slate-900 mb-2">Efectivo en caja</div>
                  <div className="flex justify-between"><span className="text-slate-600">Monto Inicial</span><span className="font-medium">{formatGuarani(session?.openingAmount ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">+ Ventas en efectivo</span><span className="font-medium">{formatGuarani(ventasEfectivo)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">+ Otros ingresos</span><span className="font-medium">{formatGuarani(otrosIngresos)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">- Gastos</span><span className="font-medium">{formatGuarani(egresos)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-medium">Efectivo esperado</span><span className="font-semibold text-[var(--primary-600)]">{formatGuarani(expectedEfectivo)}</span></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="font-medium text-slate-900 mb-2">Otras formas de pago</div>
                  <div className="flex justify-between"><span className="text-slate-600">Tarjeta</span><span className="font-medium">{formatGuarani(totalTarjeta)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Transferencia</span><span className="font-medium">{formatGuarani(totalTransferencia)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Mixto</span><span className="font-medium">{formatGuarani(totalMixto)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Crédito</span><span className="font-medium">{formatGuarani(totalCredito)}</span></div>
                  <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-medium">Total ventas</span><span className="font-semibold">{formatGuarani(salesTotal)}</span></div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Conteo de efectivo (cantidad de billetes/monedas)</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                    <div key={den} className="bg-slate-50 rounded-md p-2">
                      <div className="text-xs text-slate-500 mb-1">₲ {label}</div>
                      <input
                        type="number"
                        min="0"
                        value={billetes[den]}
                        onChange={(e) => setBilletes((prev) => ({ ...prev, [den]: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between items-center bg-white border border-slate-200 rounded-md p-3">
                  <span className="text-sm text-slate-600">Total contado en efectivo</span>
                  <span className="text-lg font-semibold text-slate-900">{formatGuarani(totalBilletes)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-600">Diferencia vs esperado</span>
                  <span className={`font-medium ${totalBilletes - expectedEfectivo === 0 ? "text-green-600" : "text-amber-600"}`}>
                    {formatGuarani(totalBilletes - expectedEfectivo)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowCerrar(false)} className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={cerrarCaja} className="flex-1 rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Cerrar Caja</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
