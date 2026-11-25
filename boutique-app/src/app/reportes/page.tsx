"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { formatGuarani } from "@/lib/utils";
import { BarChart3, Calendar, Wallet, Receipt, TrendingDown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ReportData = {
  range: { from: string; to: string };
  summary: {
    totalVentas: number;
    cantidadVentas: number;
    ticketPromedio: number;
    totalDescuentos: number;
    totalGastos: number;
    totalCreditos: number;
    totalCobrado: number;
  };
  porMetodo: Record<string, number>;
  ventasPorDia: { date: string; total: number; cantidad: number }[];
  cashSessions: Array<{
    id: string; status: string; openedAt: string; closedAt?: string | null;
    openingAmount: number; closingAmount?: number | null; expectedAmount?: number | null; difference?: number | null;
    notes?: string | null; user: { name: string } | null; salesCount: number; ingresos: number; egresos: number;
  }>;
  expenses: Array<{ id: string; amount: number; concept: string; createdAt: string; cashSession?: { user?: { name: string } | null } | null }>;
  recentSales: Array<{ id: string; number: string; total: number; paymentMethod: string; status: string; createdAt: string; customer: string; user: string }>;
};

function toInputDate(d: Date) { return d.toISOString().slice(0, 10); }

export default function ReportesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (f = from, t = to) => {
    if (!f || !t) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes?from=${f}&to=${t}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al cargar reportes");
      setData(json);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const f = toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const t = toInputDate(now);
    setFrom(f);
    setTo(t);
    void load(f, t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const maxDia = useMemo(() => Math.max(1, ...(data?.ventasPorDia.map((d) => d.total) || [1])), [data]);

  return (
    <AppShell>
      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-semibold text-slate-900 flex items-center gap-2"><BarChart3 className="h-6 w-6" />Reportes</h1>
            <p className="text-sm text-slate-500">Histórico de ventas, caja, gastos y actividad (solo admin).</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm">
              <span className="block text-slate-600 mb-1">Desde</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              <span className="block text-slate-600 mb-1">Hasta</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--primary-600)" }}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar
            </button>
          </div>
        </div>

        {loading && !data ? <div className="text-sm text-slate-500">Cargando reportes...</div> : null}

        {data && (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Card title="Ventas" value={formatGuarani(data.summary.totalVentas)} sub={`${data.summary.cantidadVentas} ventas`} icon={<Receipt className="h-4 w-4" />} />
              <Card title="Cobrado" value={formatGuarani(data.summary.totalCobrado)} sub={`Ticket prom. ${formatGuarani(data.summary.ticketPromedio)}`} icon={<Wallet className="h-4 w-4" />} />
              <Card title="Gastos" value={formatGuarani(data.summary.totalGastos)} sub="Egresos de caja" icon={<TrendingDown className="h-4 w-4" />} />
              <Card title="Crédito pendiente" value={formatGuarani(data.summary.totalCreditos)} sub={`Desc. ${formatGuarani(data.summary.totalDescuentos)}`} icon={<Calendar className="h-4 w-4" />} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h2 className="font-medium text-slate-900 mb-3">Ventas por día</h2>
                <div className="space-y-2">
                  {data.ventasPorDia.length === 0 ? <p className="text-sm text-slate-500">Sin ventas en el período.</p> : data.ventasPorDia.map((d) => (
                    <div key={d.date}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1"><span>{d.date}</span><span>{formatGuarani(d.total)} · {d.cantidad}</span></div>
                      <div className="h-2 bg-slate-100 rounded"><div className="h-2 rounded" style={{ width: `${(d.total / maxDia) * 100}%`, backgroundColor: "var(--primary-600)" }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <h2 className="font-medium text-slate-900 mb-3">Por forma de pago</h2>
                <div className="space-y-2">
                  {Object.entries(data.porMetodo).length === 0 ? <p className="text-sm text-slate-500">Sin datos.</p> : Object.entries(data.porMetodo).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm border-b border-slate-100 py-1"><span className="text-slate-600">{k}</span><span className="font-medium">{formatGuarani(v)}</span></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-medium text-slate-900">Sesiones de caja</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr>
                    <th className="px-4 py-2 text-left text-xs text-slate-500">Estado</th><th className="px-4 py-2 text-left text-xs text-slate-500">Apertura</th><th className="px-4 py-2 text-left text-xs text-slate-500">Cierre</th><th className="px-4 py-2 text-left text-xs text-slate-500">Usuario</th><th className="px-4 py-2 text-right text-xs text-slate-500">Esperado</th><th className="px-4 py-2 text-right text-xs text-slate-500">Contado</th><th className="px-4 py-2 text-right text-xs text-slate-500">Diferencia</th><th className="px-4 py-2 text-right text-xs text-slate-500">Gastos</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.cashSessions.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "ABIERTA" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-700"}`}>{s.status}</span></td>
                        <td className="px-4 py-2">{new Date(s.openedAt).toLocaleString("es-PY")}</td>
                        <td className="px-4 py-2">{s.closedAt ? new Date(s.closedAt).toLocaleString("es-PY") : "-"}</td>
                        <td className="px-4 py-2">{s.user?.name || "-"}</td>
                        <td className="px-4 py-2 text-right">{s.expectedAmount != null ? formatGuarani(s.expectedAmount) : "-"}</td>
                        <td className="px-4 py-2 text-right">{s.closingAmount != null ? formatGuarani(s.closingAmount) : "-"}</td>
                        <td className={`px-4 py-2 text-right ${s.difference ? "text-amber-600" : ""}`}>{s.difference != null ? formatGuarani(s.difference) : "-"}</td>
                        <td className="px-4 py-2 text-right">{formatGuarani(s.egresos)}</td>
                      </tr>
                    ))}
                    {data.cashSessions.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-slate-500">Sin sesiones en el período.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-medium text-slate-900">Gastos</h2></div>
                <div className="max-h-80 overflow-auto divide-y divide-slate-100">
                  {data.expenses.map((e) => (
                    <div key={e.id} className="px-4 py-2 flex justify-between gap-3 text-sm">
                      <div><div className="text-slate-900">{e.concept}</div><div className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString("es-PY")} · {e.cashSession?.user?.name || "-"}</div></div>
                      <div className="font-medium text-red-600">{formatGuarani(e.amount)}</div>
                    </div>
                  ))}
                  {data.expenses.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">Sin gastos.</div>}
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200"><h2 className="font-medium text-slate-900">Ventas recientes</h2></div>
                <div className="max-h-80 overflow-auto divide-y divide-slate-100">
                  {data.recentSales.map((s) => (
                    <div key={s.id} className="px-4 py-2 flex justify-between gap-3 text-sm">
                      <div><div className="text-slate-900">{s.number} · {s.customer}</div><div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString("es-PY")} · {s.paymentMethod} · {s.user}</div></div>
                      <div className="text-right"><div className="font-medium">{formatGuarani(s.total)}</div><div className={`text-xs ${s.status === "ANULADA" ? "text-red-600" : "text-slate-500"}`}>{s.status}</div></div>
                    </div>
                  ))}
                  {data.recentSales.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">Sin ventas.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Card({ title, value, sub, icon }: { title: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between text-slate-500 text-sm"><span>{title}</span>{icon}</div>
      <div className="text-lg lg:text-xl font-semibold text-slate-900 mt-1">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{sub}</div>
    </div>
  );
}
