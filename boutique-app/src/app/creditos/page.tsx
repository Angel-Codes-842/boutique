"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Users, DollarSign, X } from "lucide-react";
import { formatGuarani } from "@/lib/utils";
import { Toaster, toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  debt: number;
}

interface Venta {
  id: string;
  number: string;
  total: number;
  paidAmount: number;
  createdAt: string;
  status: string;
}

export default function CreditosPage() {
  const [clientes, setClientes] = useState<Customer[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<Customer | null>(null);
  const [showCobrar, setShowCobrar] = useState(false);
  const [ventaACobrar, setVentaACobrar] = useState<Venta | null>(null);
  const [montoAbono, setMontoAbono] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/ventas").then((r) => r.json()),
    ])
      .then(([clis, vts]) => {
        setClientes(Array.isArray(clis) ? clis : []);
        setVentas(Array.isArray(vts) ? vts : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const clientesConDeuda = clientes.filter((c) => c.debt > 0);

  const ventasPendientes = (clienteId: string) => {
    return ventas.filter((v: any) => v.customer?.id === clienteId && v.status === "PENDIENTE");
  };

  const totalPorCobrar = clientesConDeuda.reduce((sum, c) => sum + c.debt, 0);

  const abrirCobro = (venta: Venta) => {
    const saldo = venta.total - venta.paidAmount;
    setVentaACobrar(venta);
    setMontoAbono(String(saldo));
    setShowCobrar(true);
  };

  // Atajo móvil: cobra la primera factura pendiente o abre el detalle si no hay ninguna.
  const abrirCobroCliente = (cliente: Customer) => {
    const pendiente = ventasPendientes(cliente.id)[0];
    if (!pendiente) {
      setSelectedCliente(cliente);
      return;
    }
    setSelectedCliente(cliente);
    abrirCobro(pendiente);
  };

  const imprimirComprobanteAbono = (venta: Venta, cliente: Customer, abono: number, saldoRestante: number) => {
    const fecha = new Date().toLocaleString("es-PY");
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Comprobante de Pago ${venta.number}</title>
<style>
body{font-family:monospace;font-size:12px;width:280px;margin:0;padding:10px}
h2{text-align:center;margin:5px 0;font-size:14px}
p{margin:2px 0}
hr{border:none;border-top:1px dashed #000;margin:8px 0}
.total{font-weight:bold;font-size:13px}
</style></head><body>
<h2>BOUTIQUE POS</h2>
<p style="text-align:center">COMPROBANTE DE ABONO</p>
<hr>
<p><strong>Factura:</strong> ${venta.number}</p>
<p><strong>Fecha:</strong> ${fecha}</p>
<p><strong>Cliente:</strong> ${cliente.name}</p>
<hr>
<p style="display:flex;justify-content:space-between"><span>Total factura:</span><span>${venta.total.toLocaleString("es-PY")} Gs.</span></p>
<p style="display:flex;justify-content:space-between"><span>Abonado anteriormente:</span><span>${venta.paidAmount.toLocaleString("es-PY")} Gs.</span></p>
<p class="total" style="display:flex;justify-content:space-between"><span>ABONO HOY:</span><span>${abono.toLocaleString("es-PY")} Gs.</span></p>
<hr>
<p style="display:flex;justify-content:space-between"><span>Saldo restante:</span><span>${saldoRestante.toLocaleString("es-PY")} Gs.</span></p>
<hr>
<p style="text-align:center;margin-top:15px">¡Gracias!</p>
</body></html>`;
    const win = window.open("", "_blank", "width=320,height=600");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };

  const cobrarAbono = async () => {
    if (!ventaACobrar || !selectedCliente) return;
    const abono = Number(montoAbono) || 0;
    const saldo = ventaACobrar.total - ventaACobrar.paidAmount;
    if (abono <= 0 || abono > saldo) {
      toast.error("Monto inválido");
      return;
    }
    try {
      const res = await fetch("/api/creditos/abonar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: ventaACobrar.id,
          customerId: selectedCliente.id,
          amount: abono,
        }),
      });
      if (res.ok) {
        toast.success("Abono registrado correctamente");
        const saldoRestante = saldo - abono;
        imprimirComprobanteAbono(ventaACobrar, selectedCliente, abono, saldoRestante);
        setShowCobrar(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al registrar abono");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  return (
    <AppShell>
      <Toaster position="top-right" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Cuentas por Cobrar</h1>
          <p className="text-sm text-slate-500 mt-1">Créditos y abonos a clientes</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-4 lg:p-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 sm:h-10 sm:w-10">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm text-slate-500">Clientes con deuda</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900">{clientesConDeuda.length}</p>
              </div>
            </div>
          </div>
          <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 sm:p-4 lg:p-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 sm:h-10 sm:w-10">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs sm:text-sm text-slate-500">Total por cobrar</p>
                <p className="truncate text-lg sm:text-2xl font-semibold text-slate-900">{formatGuarani(totalPorCobrar)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="font-medium text-slate-900">Clientes con saldo pendiente</h2>
          </div>

          {/* Vista móvil */}
          <div className="divide-y divide-slate-200 lg:hidden">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
            ) : clientesConDeuda.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No hay cuentas por cobrar</div>
            ) : (
              clientesConDeuda.map((cli) => (
                <div key={cli.id} className="p-3 sm:p-4">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-slate-900">{cli.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="min-w-0 break-words">RUC/CI: {cli.document || "-"}</span>
                      <span className="min-w-0 break-words">Teléfono: {cli.phone || "-"}</span>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold text-red-600">{formatGuarani(cli.debt)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedCliente(cli)}
                      className="min-h-11 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Ver facturas
                    </button>
                    <button
                      onClick={() => abrirCobroCliente(cli)}
                      className="min-h-11 rounded-md bg-[var(--primary-600)] px-3 text-sm font-medium text-white hover:opacity-90"
                    >
                      Cobrar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista desktop */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">RUC/CI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Teléfono</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Saldo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">Cargando...</td></tr>
                ) : clientesConDeuda.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">No hay cuentas por cobrar</td></tr>
                ) : (
                  clientesConDeuda.map((cli) => (
                    <tr key={cli.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{cli.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cli.document || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{cli.phone || "-"}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-red-600">{formatGuarani(cli.debt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setSelectedCliente(cli)} className="text-sm text-[var(--primary-600)] hover:underline">Ver facturas</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 sm:pb-4">
              <div className="min-w-0">
                <h2 className="break-words text-base font-medium text-slate-900 sm:text-lg">{selectedCliente.name}</h2>
                <p className="break-words text-xs text-slate-500 sm:text-sm">
                  Saldo total: <span className="font-medium text-red-600">{formatGuarani(selectedCliente.debt)}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCliente(null)}
                aria-label="Cerrar facturas"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="pt-4 sm:pt-6">
              <h3 className="mb-4 text-sm font-medium text-slate-900">Facturas pendientes</h3>
              <div className="space-y-2">
                {ventasPendientes(selectedCliente.id).map((venta: any) => {
                  const saldo = venta.total - venta.paidAmount;
                  return (
                    <div key={venta.id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium text-slate-900">{venta.number}</p>
                        <p className="break-words text-xs text-slate-500">{new Date(venta.createdAt).toLocaleString("es-PY")}</p>
                        <p className="mt-1 break-words text-xs text-slate-600">
                          Total: {formatGuarani(venta.total)} | Abonado: {formatGuarani(venta.paidAmount)} | Saldo: <span className="font-medium text-red-600">{formatGuarani(saldo)}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => abrirCobro(venta)}
                        className="min-h-11 shrink-0 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90"
                      >
                        Cobrar abono
                      </button>
                    </div>
                  );
                })}
                {ventasPendientes(selectedCliente.id).length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">No hay facturas pendientes</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCobrar && ventaACobrar && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 sm:pb-4">
              <h2 className="text-base font-medium text-slate-900 sm:text-lg">Cobrar Abono</h2>
              <button
                onClick={() => setShowCobrar(false)}
                aria-label="Cerrar cobro"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 pt-4 sm:pt-6">
              <div className="min-w-0 break-words rounded-md bg-slate-50 p-3 text-sm">
                <p><span className="text-slate-500">Factura:</span> {ventaACobrar.number}</p>
                <p><span className="text-slate-500">Saldo pendiente:</span> <span className="font-medium text-red-600">{formatGuarani(ventaACobrar.total - ventaACobrar.paidAmount)}</span></p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Monto a abonar</label>
                <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4 sm:mt-6">
              <button onClick={() => setShowCobrar(false)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={cobrarAbono} className="min-h-11 flex-1 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90">Registrar abono</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
