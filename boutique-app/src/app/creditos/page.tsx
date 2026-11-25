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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Cuentas por Cobrar</h1>
          <p className="text-sm text-slate-500 mt-1">Créditos y abonos a clientes</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Clientes con deuda</p>
                <p className="text-2xl font-semibold text-slate-900">{clientesConDeuda.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total por cobrar</p>
                <p className="text-2xl font-semibold text-slate-900">{formatGuarani(totalPorCobrar)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">Clientes con saldo pendiente</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">RUC/CI</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Teléfono</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Saldo</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
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
                    <td className="px-6 py-4 text-sm font-medium text-red-600 text-right">{formatGuarani(cli.debt)}</td>
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

      {selectedCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-medium text-slate-900">{selectedCliente.name}</h2>
                <p className="text-sm text-slate-500">Saldo total: {formatGuarani(selectedCliente.debt)}</p>
              </div>
              <button onClick={() => setSelectedCliente(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              <h3 className="text-sm font-medium text-slate-900 mb-4">Facturas pendientes</h3>
              <div className="space-y-2">
                {ventasPendientes(selectedCliente.id).map((venta: any) => {
                  const saldo = venta.total - venta.paidAmount;
                  return (
                    <div key={venta.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{venta.number}</p>
                        <p className="text-xs text-slate-500">{new Date(venta.createdAt).toLocaleString("es-PY")}</p>
                        <p className="text-xs text-slate-600 mt-1">Total: {formatGuarani(venta.total)} | Abonado: {formatGuarani(venta.paidAmount)} | Saldo: <span className="text-red-600 font-medium">{formatGuarani(saldo)}</span></p>
                      </div>
                      <button onClick={() => abrirCobro(venta)} className="px-3 py-1.5 text-sm rounded-md bg-[var(--primary-600)] text-white hover:opacity-90">Cobrar abono</button>
                    </div>
                  );
                })}
                {ventasPendientes(selectedCliente.id).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No hay facturas pendientes</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCobrar && ventaACobrar && selectedCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-medium text-slate-900">Cobrar Abono</h2>
              <button onClick={() => setShowCobrar(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-md bg-slate-50 text-sm">
                <p><span className="text-slate-500">Factura:</span> {ventaACobrar.number}</p>
                <p><span className="text-slate-500">Saldo pendiente:</span> <span className="text-red-600 font-medium">{formatGuarani(ventaACobrar.total - ventaACobrar.paidAmount)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Monto a abonar</label>
                <input type="number" value={montoAbono} onChange={(e) => setMontoAbono(e.target.value)} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowCobrar(false)} className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={cobrarAbono} className="flex-1 rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">Registrar abono</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
