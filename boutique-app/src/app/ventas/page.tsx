"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Calendar, FileText, Eye, XCircle, Printer } from "lucide-react";
import { formatGuarani } from "@/lib/utils";
import { Toaster, toast } from "sonner";

interface Venta {
  id: string;
  number: string;
  documentType?: string;
  invoiceNumber?: string | null;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  paidAmount: number;
  changeAmount: number;
  customer?: { name: string; document?: string; phone?: string };
  user?: { name: string; role: string };
  items: any[];
  payments: any[];
}

interface Usuario {
  id: string;
  name: string;
  role: string;
}

interface ConfiguracionTienda {
  name: string;
  ruc: string | null;
  address: string | null;
  phone: string | null;
  timbrado: string | null;
  timbradoVigencia: string | null;
}

const configuracionInicial: ConfiguracionTienda = {
  name: "BOUTIQUE POS",
  ruc: "",
  address: "",
  phone: "",
  timbrado: "",
  timbradoVigencia: "",
};

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [metodoFiltro, setMetodoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
  const [showAnular, setShowAnular] = useState(false);
  const [ventaAAnular, setVentaAAnular] = useState<Venta | null>(null);
  const [adminUserId, setAdminUserId] = useState("");
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [storeConfig, setStoreConfig] = useState<ConfiguracionTienda>(configuracionInicial);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setCurrentUser(data.user))
      .catch(() => {});
  }, []);

  const fetchVentas = () => {
    setLoading(true);
    fetch("/api/ventas")
      .then((res) => res.json())
      .then((data) => {
        setVentas(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchVentas();
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => setUsuarios(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const ventasFiltradas = ventas.filter((v) => {
    const matchFecha = fechaFiltro ? new Date(v.createdAt).toISOString().split("T")[0] === fechaFiltro : true;
    const matchMetodo = metodoFiltro ? v.paymentMethod === metodoFiltro : true;
    const matchBusqueda = busqueda ? v.number.toLowerCase().includes(busqueda.toLowerCase()) : true;
    return matchFecha && matchMetodo && matchBusqueda;
  });

  const totalHoy = ventasFiltradas.reduce((sum, v) => sum + (v.status === "ANULADA" ? 0 : v.total), 0);
  const cantidad = ventasFiltradas.filter((v) => v.status !== "ANULADA").length;

  const abrirAnular = (venta: Venta) => {
    setVentaAAnular(venta);
    setShowAnular(true);
    setAdminUserId("");
  };

  const reimprimirTicket = async (venta: Venta) => {
    let configActual = storeConfig;
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data: ConfiguracionTienda = await res.json();
        if (data) {
          configActual = data;
          setStoreConfig(data);
        }
      }
    } catch {}

    const fecha = new Date(venta.createdAt).toLocaleString("es-PY");
    const itemsHtml = (venta.items || [])
      .map(
        (item: any) =>
          `<tr><td>${item.quantity}</td><td>${item.product?.name || "-"}</td><td style="text-align:right">${(item.unitPrice || 0).toLocaleString("es-PY")}</td><td style="text-align:right">${(item.total || 0).toLocaleString("es-PY")}</td></tr>`
      )
      .join("");

    const esFactura = venta.documentType === "FACTURA";
    const nroFactura = venta.invoiceNumber;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esFactura ? "Factura" : "Ticket"} ${venta.number}</title>
<style>
${esFactura ? "@page { size: A4; margin: 15mm; } body{font-family:monospace;font-size:11px;margin:0;padding:0}" : "@page { size: 80mm auto; margin: 0; } body{font-family:monospace;font-size:11px;width:72mm;margin:0;padding:4mm}"}
h2{text-align:center;margin:3px 0;font-size:13px}
p{margin:1px 0}
hr{border:none;border-top:1px dashed #000;margin:6px 0}
.total{font-weight:bold;font-size:12px}
table{width:100%;border-collapse:collapse;margin:6px 0}
th,td{padding:2px;font-size:10px}
</style></head><body>
${esFactura ? `
<div style="display:flex;justify-content:space-between">
  <div>
    <h2 style="text-align:left;margin:0">${configActual.name.toUpperCase()}</h2>
    ${configActual.ruc ? `<p>RUC: ${configActual.ruc}</p>` : ""}
    ${configActual.address ? `<p>Dirección: ${configActual.address}</p>` : ""}
    ${configActual.phone ? `<p>Teléfono: ${configActual.phone}</p>` : ""}
    ${configActual.timbrado ? `<p><strong>TIMBRADO N°:</strong> ${configActual.timbrado}</p>` : ""}
    ${configActual.timbradoVigencia ? `<p><strong>Vigencia:</strong> ${new Date(configActual.timbradoVigencia).toLocaleDateString("es-PY")}</p>` : ""}
  </div>
  <div style="border:1px solid #000;padding:8px;text-align:center">
    <p style="font-weight:bold">FACTURA</p>
    <p style="font-size:12px;font-weight:bold">${nroFactura || venta.number}</p>
    <p style="font-size:9px">Sin valor fiscal</p>
  </div>
</div>
<hr>
<div style="display:flex;justify-content:space-between">
  <div>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Cliente:</strong> ${venta.customer?.name || "CONSUMIDOR FINAL"}</p>
    ${venta.customer?.document ? `<p><strong>RUC/CI:</strong> ${venta.customer.document}</p>` : ""}
  </div>
  <div>
    <p><strong>Condición:</strong> ${venta.paymentMethod === "CREDITO" ? "CRÉDITO" : "CONTADO"}</p>
    <p><strong>Forma de pago:</strong> ${venta.paymentMethod}</p>
  </div>
</div>
<hr>
<table style="border:1px solid #000">
<thead style="background:#f5f5f5"><tr><th style="border:1px solid #000;text-align:left">CANT</th><th style="border:1px solid #000;text-align:left">DESCRIPCIÓN</th><th style="border:1px solid #000;text-align:right">P.UNIT</th><th style="border:1px solid #000;text-align:right">TOTAL</th></tr></thead>
<tbody>${itemsHtml.replace(/<tr>/g, '<tr>').replace(/<td>/g, '<td style="border:1px solid #000">')}</tbody>
</table>
<div style="text-align:right;margin-top:10px">
  <p>Subtotal: ${(venta.subtotal || 0).toLocaleString("es-PY")} Gs.</p>
  ${venta.discount > 0 ? `<p>Descuento: -${venta.discount.toLocaleString("es-PY")} Gs.</p>` : ""}
  <p class="total">TOTAL: ${venta.total.toLocaleString("es-PY")} Gs.</p>
</div>
<hr>
<p style="text-align:center;margin-top:20px;font-size:9px">Factura impresa manualmente - No válida para crédito fiscal</p>
` : `
<h2>${configActual.name.toUpperCase()}</h2>
${configActual.ruc ? `<p style="text-align:center">RUC: ${configActual.ruc}</p>` : ""}
${configActual.address ? `<p style="text-align:center">${configActual.address}</p>` : ""}
${configActual.phone ? `<p style="text-align:center">Tel: ${configActual.phone}</p>` : ""}
<hr>
<p style="text-align:center;font-weight:bold">TICKET DE VENTA</p>
<hr>
<p><strong>N°:</strong> ${venta.number}</p>
<p><strong>Fecha:</strong> ${fecha}</p>
<p><strong>Cliente:</strong> ${venta.customer?.name || "CONSUMIDOR FINAL"}</p>
${venta.customer?.document ? `<p><strong>RUC/CI:</strong> ${venta.customer.document}</p>` : ""}
<p><strong>Forma de pago:</strong> ${venta.paymentMethod}</p>
<p><strong>Estado:</strong> ${venta.status}</p>
<hr>
<table>
<thead><tr><th style="text-align:left">Cant</th><th style="text-align:left">Desc</th><th style="text-align:right">P.U.</th><th style="text-align:right">Importe</th></tr></thead>
<tbody>${itemsHtml}</tbody>
</table>
<hr>
<p style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>${(venta.subtotal || 0).toLocaleString("es-PY")} Gs.</span></p>
${venta.discount > 0 ? `<p style="display:flex;justify-content:space-between"><span>Descuento:</span><span>-${venta.discount.toLocaleString("es-PY")} Gs.</span></p>` : ""}
<p class="total" style="display:flex;justify-content:space-between"><span>TOTAL:</span><span>${venta.total.toLocaleString("es-PY")} Gs.</span></p>
<p style="display:flex;justify-content:space-between"><span>Pagado:</span><span>${venta.paidAmount.toLocaleString("es-PY")} Gs.</span></p>
<p style="display:flex;justify-content:space-between"><span>Vuelto:</span><span>${venta.changeAmount.toLocaleString("es-PY")} Gs.</span></p>
<hr>
<p style="text-align:center;margin-top:8px">¡GRACIAS POR SU COMPRA!</p>
<p style="text-align:center">REIMPRESIÓN</p>
`}
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 300);
      };
    }
  };

  const confirmarAnular = async () => {
    if (!ventaAAnular || !adminUserId) {
      toast.error("Seleccione un usuario administrador");
      return;
    }
    try {
      const res = await fetch(`/api/ventas/${ventaAAnular.id}/anular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId }),
      });
      if (res.ok) {
        toast.success("Venta anulada correctamente. Stock devuelto.");
        setShowAnular(false);
        fetchVentas();
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al anular");
      }
    } catch {
      toast.error("Error de conexión");
    }
  };

  return (
    <AppShell>
      <Toaster position="top-right" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Ventas</h1>
          <p className="text-sm text-slate-500 mt-1">Historial de ventas</p>
        </div>

        <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-3 mb-4 lg:mb-6">
          <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
            <p className="text-sm text-slate-500">Total (no anuladas)</p>
            <p className="truncate text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(totalHoy)}</p>
          </div>
          <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
            <p className="text-sm text-slate-500">Cantidad (no anuladas)</p>
            <p className="truncate text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{cantidad}</p>
          </div>
          <div className="min-w-0 bg-white rounded-lg border border-slate-200 p-3 sm:p-4 lg:p-6">
            <p className="text-sm text-slate-500">Ticket Promedio</p>
            <p className="truncate text-xl sm:text-2xl font-semibold text-slate-900 mt-1">{formatGuarani(cantidad > 0 ? Math.round(totalHoy / cantidad) : 0)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 mb-4 lg:mb-6">
          <div className="p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="min-h-11 min-w-0 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)] sm:w-auto"
              />
            </div>
            <select
              value={metodoFiltro}
              onChange={(e) => setMetodoFiltro(e.target.value)}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)] sm:w-auto"
            >
              <option value="">Todas las formas de pago</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="MIXTO">Mixto</option>
            </select>
            <input
              type="text"
              placeholder="Buscar por N° ticket..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)] sm:w-auto"
            />
            {(fechaFiltro || metodoFiltro || busqueda) && (
              <button onClick={() => { setFechaFiltro(""); setMetodoFiltro(""); setBusqueda(""); }} className="min-h-11 text-left text-sm text-slate-600 hover:text-slate-900">
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-slate-200">
            <h2 className="font-medium text-slate-900">Historial</h2>
          </div>
          {/* Vista móvil */}
          <div className="lg:hidden divide-y divide-slate-200">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
            ) : ventasFiltradas.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">No hay ventas registradas</p>
              </div>
            ) : (
              ventasFiltradas.map((venta) => (
                <div key={venta.id} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-mono font-medium text-slate-900">{venta.number}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${venta.status === "ANULADA" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{venta.status}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="min-w-0 truncate text-xs text-slate-500">{new Date(venta.createdAt).toLocaleString("es-PY")}</span>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">{formatGuarani(venta.total)}</span>
                  </div>
                  <div className="mb-2 truncate text-xs text-slate-500">
                    {venta.customer?.name || "Sin cliente"} · {venta.paymentMethod}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => reimprimirTicket(venta)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100" title="Reimprimir" aria-label="Reimprimir ticket">
                      <Printer className="h-4 w-4" />
                    </button>
                    <button onClick={() => setVentaDetalle(venta)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-slate-600 hover:bg-slate-100" title="Ver detalle" aria-label="Ver detalle">
                      <Eye className="h-4 w-4" />
                    </button>
                    {venta.status !== "ANULADA" && currentUser?.role === "ADMIN" && (
                      <button onClick={() => abrirAnular(venta)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 text-red-600 hover:bg-red-50" title="Anular" aria-label="Anular venta">
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
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
                  <th className="text-left px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">N°</th>
                  <th className="text-left px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cajero</th>
                  <th className="text-left px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Forma de Pago</th>
                  <th className="text-left px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-right px-4 lg:px-6 py-2 lg:py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 lg:px-6 py-8 text-center text-sm text-slate-500">Cargando...</td></tr>
                ) : ventasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 lg:px-6 py-8 text-center">
                      <FileText className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">No hay ventas registradas</p>
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((venta) => (
                    <tr key={venta.id} className="hover:bg-slate-50">
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm font-mono text-slate-900">{venta.number}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-slate-600">{new Date(venta.createdAt).toLocaleString("es-PY")}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-slate-900">{venta.customer?.name || "Sin cliente"}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-slate-600">{venta.user?.name || "-"}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm text-slate-600">{venta.paymentMethod}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${venta.status === "ANULADA" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                          {venta.status}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-sm font-medium text-slate-900 text-right">{formatGuarani(venta.total)}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => reimprimirTicket(venta)} className="rounded-md p-1 text-slate-600 hover:bg-slate-100" title="Reimprimir ticket">
                            <Printer className="h-4 w-4" />
                          </button>
                          <button onClick={() => setVentaDetalle(venta)} className="rounded-md p-1 text-slate-600 hover:bg-slate-100" title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </button>
                          {venta.status !== "ANULADA" && currentUser?.role === "ADMIN" && (
                            <button onClick={() => abrirAnular(venta)} className="rounded-md p-1 text-red-600 hover:bg-red-50" title="Anular venta">
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
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

      {ventaDetalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-2xl rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="min-w-0 break-words text-lg font-medium text-slate-900">Detalle de Venta {ventaDetalle.number}</h2>
              <button onClick={() => setVentaDetalle(null)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-100"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0 break-words"><span className="text-slate-500">Fecha:</span> <span className="text-slate-900">{new Date(ventaDetalle.createdAt).toLocaleString("es-PY")}</span></div>
                <div className="min-w-0 break-words"><span className="text-slate-500">Cajero:</span> <span className="text-slate-900">{ventaDetalle.user?.name || "-"}</span></div>
                <div className="min-w-0 break-words"><span className="text-slate-500">Cliente:</span> <span className="text-slate-900">{ventaDetalle.customer?.name || "Sin cliente"}</span></div>
                <div className="min-w-0 break-words"><span className="text-slate-500">Forma de pago:</span> <span className="text-slate-900">{ventaDetalle.paymentMethod}</span></div>
                <div className="min-w-0 break-words"><span className="text-slate-500">Estado:</span> <span className={ventaDetalle.status === "ANULADA" ? "text-red-600" : "text-green-600"}>{ventaDetalle.status}</span></div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                {/* Vista móvil */}
                <div className="sm:hidden divide-y divide-slate-200">
                  {ventaDetalle.items?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-medium text-slate-900">{item.product?.name || "-"}</span>
                        <span className="shrink-0 text-sm font-semibold text-slate-900">{formatGuarani(item.total)}</span>
                      </div>
                      <div className="mt-1 flex justify-between gap-3 text-xs text-slate-500">
                        <span>Cant.: {item.quantity}</span>
                        <span className="shrink-0">P.Unit: {formatGuarani(item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Vista desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Producto</th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-slate-500">Cant.</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">P.Unit</th>
                        <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ventaDetalle.items?.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-slate-900">{item.product?.name || "-"}</td>
                          <td className="px-4 py-2 text-sm text-slate-600 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-slate-600 text-right">{formatGuarani(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-sm text-slate-900 text-right">{formatGuarani(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-2 text-sm border-t border-slate-200 pt-4">
                <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-500">Subtotal</span><span className="shrink-0 text-slate-900">{formatGuarani(ventaDetalle.subtotal)}</span></div>
                <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-500">Descuento</span><span className="shrink-0 text-slate-900">{formatGuarani(ventaDetalle.discount)}</span></div>
                <div className="flex items-start justify-between gap-2 font-medium text-base"><span className="min-w-0 text-slate-900">Total</span><span className="shrink-0 text-slate-900">{formatGuarani(ventaDetalle.total)}</span></div>
                <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-500">Pagado</span><span className="shrink-0 text-slate-900">{formatGuarani(ventaDetalle.paidAmount)}</span></div>
                <div className="flex items-start justify-between gap-2"><span className="min-w-0 text-slate-500">Vuelto</span><span className="shrink-0 text-slate-900">{formatGuarani(ventaDetalle.changeAmount)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAnular && ventaAAnular && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-medium text-slate-900">Anular Venta</h2>
              <button onClick={() => setShowAnular(false)} aria-label="Cerrar" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-1 text-slate-400 hover:bg-slate-100"><XCircle className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">¿Está seguro de anular la venta <strong>{ventaAAnular.number}</strong>? Se devolverá el stock al inventario.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Usuario Administrador</label>
                <select value={adminUserId} onChange={(e) => setAdminUserId(e.target.value)} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]">
                  <option value="">Seleccionar...</option>
                  {usuarios.filter(u => u.role === "ADMIN").map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-3">
              <button onClick={() => setShowAnular(false)} className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmarAnular} className="min-h-11 flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Anular</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
