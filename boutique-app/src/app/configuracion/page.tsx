"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Store, Receipt, Database, Save, PlugZap } from "lucide-react";
import { Toaster, toast } from "sonner";

interface FactpyPublicStatus {
  enabled: boolean;
  configured: boolean;
  environment: "test" | "production";
  apiUrl: string;
  available: boolean;
}

type ConfiguracionState = {
  name: string;
  ruc: string;
  address: string;
  phone: string;
  ticketPrefix: string;
  ticketNumber: number;
  establecimiento: string;
  puntoExpedicion: string;
  timbrado: string;
  timbradoVigencia: string;
  invoiceNumber: number;
  factpy?: FactpyPublicStatus;
};

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<ConfiguracionState>({
    name: "",
    ruc: "",
    address: "",
    phone: "",
    ticketPrefix: "T",
    ticketNumber: 1,
    establecimiento: "001",
    puntoExpedicion: "001",
    timbrado: "",
    timbradoVigencia: "",
    invoiceNumber: 1,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data) setConfig(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) toast.success("Configuración guardada");
      else toast.error("Error al guardar");
    } catch {
      toast.error("Error de conexión");
    }
  };

  return (
    <AppShell>
      <Toaster position="top-right" />
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Configuración</h1>
          <p className="mt-1 text-sm text-slate-500">Configuración general del sistema</p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-50)]">
                <Store className="h-5 w-5 text-[var(--primary-600)]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-slate-900">Datos de la Tienda</h2>
                <p className="text-sm text-slate-500">Información para comprobantes</p>
              </div>
            </div>
            <div className="space-y-4 p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre de la Tienda</label>
                  <input type="text" value={config.name} onChange={(e) => setConfig({...config, name: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">RUC</label>
                  <input type="text" value={config.ruc || ""} onChange={(e) => setConfig({...config, ruc: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono</label>
                  <input type="text" value={config.phone || ""} onChange={(e) => setConfig({...config, phone: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Dirección</label>
                  <input type="text" value={config.address || ""} onChange={(e) => setConfig({...config, address: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-50)]">
                <Receipt className="h-5 w-5 text-[var(--primary-600)]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-slate-900">Ticket</h2>
                <p className="text-sm text-slate-500">Configuración del comprobante interno/ticket</p>
              </div>
            </div>
            <div className="space-y-4 p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Prefijo de ticket</label>
                  <input type="text" value={config.ticketPrefix} onChange={(e) => setConfig({...config, ticketPrefix: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" placeholder="T" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Próximo N° de ticket</label>
                  <input type="number" value={config.ticketNumber || 1} onChange={(e) => setConfig({...config, ticketNumber: Number(e.target.value)})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Vista previa: {(config.ticketPrefix || "T")}-{String(config.ticketNumber || 1).padStart(5, "0")}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--primary-50)]">
                <Receipt className="h-5 w-5 text-[var(--primary-600)]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-slate-900">Factura</h2>
                <p className="text-sm text-slate-500">Configuración de factura manual (Paraguay, sin valor fiscal)</p>
              </div>
            </div>
            <div className="space-y-4 p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Establecimiento</label>
                  <input type="text" value={config.establecimiento || "001"} onChange={(e) => setConfig({...config, establecimiento: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" placeholder="001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Punto de Expedición</label>
                  <input type="text" value={config.puntoExpedicion || "001"} onChange={(e) => setConfig({...config, puntoExpedicion: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" placeholder="001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">N° Timbrado</label>
                  <input type="text" value={config.timbrado || ""} onChange={(e) => setConfig({...config, timbrado: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" placeholder="12345678" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vigencia Timbrado</label>
                  <input type="date" value={config.timbradoVigencia ? config.timbradoVigencia.split('T')[0] : ""} onChange={(e) => setConfig({...config, timbradoVigencia: e.target.value})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Próximo N° de Factura</label>
                  <input type="number" value={config.invoiceNumber || 1} onChange={(e) => setConfig({...config, invoiceNumber: Number(e.target.value)})} className="min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]" />
                </div>
              </div>
              <p className="text-xs text-slate-500">Formato de factura: {(config.establecimiento || "001")}-{(config.puntoExpedicion || "001")}-{String(config.invoiceNumber || 1).padStart(7, "0")}</p>
              {config.timbrado && <p className="text-xs text-slate-500">Timbrado N° {config.timbrado}</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <PlugZap className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-slate-900">Facturación electrónica (FACTPY)</h2>
                <p className="text-sm text-slate-500">Preparado para SIFEN / DNIT — aún no activo</p>
              </div>
            </div>
            <div className="space-y-3 p-3 sm:p-4 lg:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  {config.factpy?.enabled ? "Habilitado (pendiente de implementar)" : "Deshabilitado"}
                </span>
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {config.factpy?.available === false ? "Sin emisión disponible" : "No disponible"}
                </span>
              </div>
              <div className="min-w-0 space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Ambiente:</span> {config.factpy?.environment || "test"}</p>
                <p className="min-w-0 break-all"><span className="font-medium">API:</span> <span className="min-w-0 break-all">{config.factpy?.apiUrl || "https://api.factpy.com"}</span></p>
                <p><span className="font-medium">recordID:</span> {config.factpy?.configured ? "Configurado en el servidor" : "No configurado"}</p>
              </div>
              <p className="text-xs text-slate-500">
                Los comprobantes siguen siendo manuales e internos (&ldquo;Sin valor fiscal&rdquo;).
                La activación se hará en una etapa posterior. Ver <code>docs/FACTPY.md</code>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <Database className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium text-slate-900">Sistema</h2>
                <p className="text-sm text-slate-500">Información del sistema</p>
              </div>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              <div className="space-y-1 text-sm text-slate-600">
                <p><span className="font-medium">Versión:</span> 1.0.0</p>
                <p><span className="font-medium">Stack:</span> Next.js 16 + Prisma + PostgreSQL</p>
                <p><span className="font-medium">Moneda:</span> Guaraníes (PYG)</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={save} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 sm:w-auto sm:px-6">
              <Save className="h-4 w-4" />
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
