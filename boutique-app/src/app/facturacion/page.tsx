"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileDown,
  FileText,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { formatGuarani } from "@/lib/utils";

type EstadoDocumento =
  | "PENDIENTE"
  | "APROBADO"
  | "RECHAZADO"
  | "ANULADO"
  | "INUTILIZADO";

type TipoDocumento =
  | "FACTURA_CONTADO"
  | "FACTURA_CREDITO_PLAZO"
  | "FACTURA_CREDITO_CUOTAS"
  | "RECIBO"
  | "NOTA_CREDITO"
  | "AUTOFACTURA"
  | "NOTA_REMISION"
  | "ANTICIPO"
  | "FACTURA_EXPORTACION";

type TipoEvento = "CANCELACION" | "INUTILIZACION" | "NOMINACION";
type TipoManual = "AUTOFACTURA" | "NOTA_REMISION" | "ANTICIPO" | "FACTURA_EXPORTACION";
type Tab = "documentos" | "eventos" | "otros";

interface FactpyEstado {
  enabled: boolean;
  configured: boolean;
  environment: "test" | "production";
  apiUrl: string;
  available: boolean;
}

interface ClienteResumen {
  id: string;
  name: string;
  document?: string | null;
}

interface VentaResumen {
  id: string;
  number: number | string;
  invoiceNumber?: string | null;
  total: number;
  status?: string;
}

interface PagoResumen {
  id: string;
  amount: number;
  method?: string;
}

interface Documento {
  id: string;
  receiptid: string;
  kind: TipoDocumento;
  status: EstadoDocumento;
  saleId?: string | null;
  paymentId?: string | null;
  customerId?: string | null;
  establecimiento: string;
  punto: string;
  numero: string;
  timbrado?: string | null;
  fechaEmision: string;
  payload?: unknown;
  cdc?: string | null;
  cdcSpace?: string | null;
  link?: string | null;
  xmlLink?: string | null;
  kude?: string | null;
  code?: string | null;
  mensaje?: string | null;
  documento?: string | null;
  numeroTr?: string | null;
  intentos: number;
  ultimoError?: string | null;
  enviadoAt?: string | null;
  aprobadoAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sale?: VentaResumen | null;
  customer?: ClienteResumen | null;
  payment?: PagoResumen | null;
  _count?: { events: number };
}

interface EventoFactpy {
  id: string;
  tipo: TipoEvento;
  status: string;
  documentId?: string | null;
  cdc?: string | null;
  tipoDoc?: string | null;
  timbrado?: string | null;
  establecimiento?: string | null;
  punto?: string | null;
  desde?: string | null;
  hasta?: string | null;
  motivo?: string | null;
  nombre?: string | null;
  ruc?: string | null;
  correo?: string | null;
  code?: string | null;
  fechaRespuesta?: string | null;
  intentos: number;
  ultimoError?: string | null;
  createdAt: string;
  updatedAt: string;
  document?: {
    receiptid: string;
    numero: string;
    kind: string;
    cdc?: string | null;
  } | null;
}

type DocumentoDetalle = Documento & { events: EventoFactpy[] };

interface ResultadoEnvio {
  id?: string;
  estado?: string;
  documentId?: string;
  mensaje?: string;
}

interface CampoEvento {
  clave: keyof FormEvento;
  etiqueta: string;
  requerido?: boolean;
  placeholder?: string;
}

interface FormEvento {
  tipo: TipoEvento;
  documentId: string;
  cdc: string;
  motivo: string;
  timbrado: string;
  tipoDoc: string;
  establecimiento: string;
  punto: string;
  desde: string;
  hasta: string;
  nombre: string;
  ruc: string;
  correo: string;
}

interface FormManual {
  tipo: TipoManual;
  nombre: string;
  ruc: string;
  descripcionItem: string;
  codigo: string;
  cantidad: string;
  precioUnitario: string;
  descripcion: string;
  campos: string;
}

const ESTADOS_DOCUMENTO: EstadoDocumento[] = [
  "PENDIENTE",
  "APROBADO",
  "RECHAZADO",
  "ANULADO",
  "INUTILIZADO",
];

const TIPOS_DOCUMENTO: TipoDocumento[] = [
  "FACTURA_CONTADO",
  "FACTURA_CREDITO_PLAZO",
  "FACTURA_CREDITO_CUOTAS",
  "RECIBO",
  "NOTA_CREDITO",
  "AUTOFACTURA",
  "NOTA_REMISION",
  "ANTICIPO",
  "FACTURA_EXPORTACION",
];

const ETIQUETAS_TIPO: Record<TipoDocumento, string> = {
  FACTURA_CONTADO: "Factura de contado",
  FACTURA_CREDITO_PLAZO: "Factura a crédito - plazo",
  FACTURA_CREDITO_CUOTAS: "Factura a crédito - cuotas",
  RECIBO: "Recibo",
  NOTA_CREDITO: "Nota de crédito",
  AUTOFACTURA: "Autofactura",
  NOTA_REMISION: "Nota de remisión",
  ANTICIPO: "Anticipo",
  FACTURA_EXPORTACION: "Factura de exportación",
};

const ESTILOS_ESTADO: Record<string, string> = {
  APROBADO: "bg-emerald-50 text-emerald-700",
  ACEPTADO: "bg-emerald-50 text-emerald-700",
  PENDIENTE: "bg-amber-50 text-amber-700",
  RECHAZADO: "bg-rose-50 text-rose-700",
  ERROR: "bg-rose-50 text-rose-700",
  ANULADO: "bg-rose-50 text-rose-700",
  INUTILIZADO: "bg-rose-50 text-rose-700",
  OMITIDO: "bg-slate-100 text-slate-600",
};

const CAMPOS_POR_EVENTO: Record<TipoEvento, CampoEvento[]> = {
  CANCELACION: [
    { clave: "cdc", etiqueta: "CDC del documento", requerido: true, placeholder: "Código de control" },
    { clave: "motivo", etiqueta: "Motivo", requerido: true, placeholder: "Motivo de la anulación" },
  ],
  INUTILIZACION: [
    { clave: "timbrado", etiqueta: "Timbrado", requerido: true },
    { clave: "tipoDoc", etiqueta: "Tipo de documento", requerido: true, placeholder: "Ej. 1" },
    { clave: "establecimiento", etiqueta: "Establecimiento", requerido: true },
    { clave: "punto", etiqueta: "Punto de emisión", requerido: true },
    { clave: "desde", etiqueta: "Desde", requerido: true },
    { clave: "hasta", etiqueta: "Hasta", requerido: true },
    { clave: "motivo", etiqueta: "Motivo", placeholder: "Salto de numeración" },
  ],
  NOMINACION: [
    { clave: "cdc", etiqueta: "CDC del documento", requerido: true },
    { clave: "nombre", etiqueta: "Nombre o razón social", requerido: true },
    { clave: "ruc", etiqueta: "RUC", requerido: true },
    { clave: "correo", etiqueta: "Correo electrónico" },
  ],
};

const AYUDA_CAMPOS: Record<TipoManual, string> = {
  AUTOFACTURA: 'Autofactura: { "autofactura": { ... } }',
  NOTA_REMISION: 'Nota de remisión: { "cliente": { ... }, "transporte": [ ... ] }',
  ANTICIPO: "Opcional; no requiere campos adicionales.",
  FACTURA_EXPORTACION: 'Exportación: { "exportacion": { ... } }',
};

const FORM_EVENTO_VACIO: FormEvento = {
  tipo: "CANCELACION",
  documentId: "",
  cdc: "",
  motivo: "",
  timbrado: "",
  tipoDoc: "",
  establecimiento: "",
  punto: "",
  desde: "",
  hasta: "",
  nombre: "",
  ruc: "",
  correo: "",
};

const FORM_MANUAL_VACIO: FormManual = {
  tipo: "AUTOFACTURA",
  nombre: "",
  ruc: "",
  descripcionItem: "",
  codigo: "",
  cantidad: "1",
  precioUnitario: "0",
  descripcion: "",
  campos: "",
};

function BadgeEstado({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        ESTILOS_ESTADO[estado] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {estado}
    </span>
  );
}

async function leerRespuesta<T>(respuesta: Response): Promise<T> {
  const datos = (await respuesta.json().catch(() => ({}))) as T & { error?: string };
  if (!respuesta.ok) {
    throw new Error(datos.error || "No se pudo completar la solicitud");
  }
  return datos;
}

function mensajeError(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la solicitud";
}

function fechaTexto(valor?: string | null): string {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resumir(valor?: string | null, largo = 28): string {
  if (!valor) return "-";
  if (valor.length <= largo) return valor;
  const inicio = Math.max(1, Math.round(largo * 0.65));
  const fin = Math.max(1, largo - inicio - 1);
  return `${valor.slice(0, inicio)}…${valor.slice(-fin)}`;
}

function numeroDocumento(documento: Documento): string {
  return [documento.establecimiento, documento.punto, documento.numero]
    .filter(Boolean)
    .join("-");
}

function totalDocumento(documento: Documento): number {
  return documento.payment?.amount ?? documento.sale?.total ?? 0;
}

function esExitoso(estado?: string): boolean {
  return estado === "APROBADO" || estado === "ACEPTADO" || estado === "PENDIENTE" || estado === "OMITIDO";
}

export default function FacturacionPage() {
  const [tab, setTab] = useState<Tab>("documentos");
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [eventos, setEventos] = useState<EventoFactpy[]>([]);
  const [factpy, setFactpy] = useState<FactpyEstado | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [cargandoDocumentos, setCargandoDocumentos] = useState(true);
  const [cargandoEventos, setCargandoEventos] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);

  const [detalle, setDetalle] = useState<DocumentoDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);

  const [mostrarEvento, setMostrarEvento] = useState(false);
  const [formEvento, setFormEvento] = useState<FormEvento>(FORM_EVENTO_VACIO);
  const [guardandoEvento, setGuardandoEvento] = useState(false);

  const [mostrarManual, setMostrarManual] = useState(false);
  const [formManual, setFormManual] = useState<FormManual>(FORM_MANUAL_VACIO);
  const [guardandoManual, setGuardandoManual] = useState(false);

  const cargarDocumentos = useCallback(
    async (signal?: AbortSignal) => {
      setCargandoDocumentos(true);
      try {
        const parametros = new URLSearchParams();
        if (filtroEstado) parametros.set("estado", filtroEstado);
        if (filtroTipo) parametros.set("tipo", filtroTipo);
        const consulta = parametros.toString();
        const respuesta = await fetch(
          `/api/facturacion/documentos${consulta ? `?${consulta}` : ""}`,
          { signal }
        );
        const datos = await leerRespuesta<{
          documentos: Documento[];
          factpy: FactpyEstado;
        }>(respuesta);
        setDocumentos(datos.documentos ?? []);
        setFactpy(datos.factpy ?? null);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        toast.error(mensajeError(error));
      } finally {
        if (!signal?.aborted) setCargandoDocumentos(false);
      }
    },
    [filtroEstado, filtroTipo]
  );

  const cargarEventos = useCallback(async (signal?: AbortSignal) => {
    setCargandoEventos(true);
    try {
      const respuesta = await fetch("/api/facturacion/eventos", { signal });
      const datos = await leerRespuesta<{ eventos: EventoFactpy[] }>(respuesta);
      setEventos(datos.eventos ?? []);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(mensajeError(error));
    } finally {
      if (!signal?.aborted) setCargandoEventos(false);
    }
  }, []);

  useEffect(() => {
    const control = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos remotos
    void cargarDocumentos(control.signal);
    return () => control.abort();
  }, [tab, cargarDocumentos]);

  useEffect(() => {
    const control = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos remotos
    void cargarEventos(control.signal);
    return () => control.abort();
  }, [tab, cargarEventos]);

  const sincronizarEstados = async () => {
    setSincronizando(true);
    try {
      const respuesta = await fetch("/api/facturacion/estados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const datos = await leerRespuesta<{ actualizados: number; mensaje?: string }>(respuesta);
      toast.success(datos.mensaje ?? `Estados actualizados: ${datos.actualizados}`);
      await Promise.all([cargarDocumentos(), cargarEventos()]);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setSincronizando(false);
    }
  };

  const abrirDetalle = async (documento: Documento) => {
    setDetalle({ ...documento, events: [] });
    setCargandoDetalle(true);
    try {
      const respuesta = await fetch(
        `/api/facturacion/documentos/${encodeURIComponent(documento.id)}`
      );
      const datos = await leerRespuesta<DocumentoDetalle>(respuesta);
      setDetalle(datos);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirArchivo = (documento: Documento, tipo: "kude" | "xml") => {
    window.open(
      `/api/facturacion/documentos/${encodeURIComponent(documento.id)}/archivo/${tipo}`,
      "_blank",
      "noopener"
    );
  };

  const reenviar = async (documento: Documento) => {
    setReenviandoId(documento.id);
    try {
      const respuesta = await fetch(
        `/api/facturacion/documentos/${encodeURIComponent(documento.id)}/reenviar`,
        { method: "POST" }
      );
      const datos = await leerRespuesta<ResultadoEnvio>(respuesta);
      if (esExitoso(datos.estado)) {
        toast.success(datos.mensaje ?? "Documento reenviado");
      } else {
        toast.error(datos.mensaje ?? "No se pudo reenviar el documento");
      }
      await Promise.all([cargarDocumentos(), cargarEventos()]);
      if (detalle?.id === documento.id) {
        await abrirDetalle(documento);
      }
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setReenviandoId(null);
    }
  };

  const abrirNuevoEvento = () => {
    setFormEvento({ ...FORM_EVENTO_VACIO });
    setMostrarEvento(true);
  };

  const crearEvento = async () => {
    const campos = CAMPOS_POR_EVENTO[formEvento.tipo];
    const cuerpo: Record<string, string> = { tipo: formEvento.tipo };
    for (const campo of campos) {
      const valor = formEvento[campo.clave].trim();
      if (campo.requerido && !valor) {
        toast.error(`El campo ${campo.etiqueta.toLowerCase()} es obligatorio`);
        return;
      }
      if (valor) cuerpo[campo.clave] = valor;
    }

    setGuardandoEvento(true);
    try {
      const respuesta = await fetch("/api/facturacion/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await leerRespuesta<ResultadoEnvio>(respuesta);
      if (esExitoso(datos.estado)) {
        toast.success(datos.mensaje ?? "Evento registrado");
      } else {
        toast.error(datos.mensaje ?? "No se pudo registrar el evento");
      }
      setMostrarEvento(false);
      await Promise.all([cargarDocumentos(), cargarEventos()]);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setGuardandoEvento(false);
    }
  };

  const abrirNuevoManual = () => {
    setFormManual({ ...FORM_MANUAL_VACIO });
    setMostrarManual(true);
  };

  const emitirManual = async () => {
    const cantidad = Number.parseInt(formManual.cantidad, 10);
    const precio = Number.parseInt(formManual.precioUnitario, 10);

    if (!formManual.nombre.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    if (!formManual.descripcionItem.trim()) {
      toast.error("La descripción del ítem es obligatoria");
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      toast.error("La cantidad debe ser un entero mayor a cero");
      return;
    }
    if (!Number.isInteger(precio) || precio < 0) {
      toast.error("El precio unitario debe ser un entero válido en Guaraníes");
      return;
    }

    let campos: Record<string, unknown> = {};
    if (formManual.campos.trim()) {
      try {
        const parseado: unknown = JSON.parse(formManual.campos);
        if (!parseado || typeof parseado !== "object" || Array.isArray(parseado)) {
          throw new Error("Debe ser un objeto JSON");
        }
        campos = parseado as Record<string, unknown>;
      } catch {
        toast.error("Los campos específicos deben ser un JSON válido");
        return;
      }
    }

    const total = cantidad * precio;
    if (total <= 0) {
      toast.error("El total debe ser mayor a cero");
      return;
    }

    const cuerpo = {
      tipo: formManual.tipo,
      cliente: {
        nombre: formManual.nombre.trim(),
        ...(formManual.ruc.trim() ? { ruc: formManual.ruc.trim() } : {}),
      },
      items: [
        {
          descripcion: formManual.descripcionItem.trim(),
          ...(formManual.codigo.trim() ? { codigo: formManual.codigo.trim() } : {}),
          cantidad,
          precioUnitario: precio,
          total,
        },
      ],
      total,
      ...(formManual.descripcion.trim() ? { descripcion: formManual.descripcion.trim() } : {}),
      campos,
    };

    setGuardandoManual(true);
    try {
      const respuesta = await fetch("/api/facturacion/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const datos = await leerRespuesta<ResultadoEnvio>(respuesta);
      if (esExitoso(datos.estado)) {
        toast.success(datos.mensaje ?? "Documento emitido correctamente");
      } else {
        toast.error(datos.mensaje ?? "No se pudo emitir el documento");
      }
      setMostrarManual(false);
      await Promise.all([cargarDocumentos(), cargarEventos()]);
    } catch (error) {
      toast.error(mensajeError(error));
    } finally {
      setGuardandoManual(false);
    }
  };

  const columnaClase = "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500";

  return (
    <AppShell>
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:mb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
              Facturación electrónica
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Documentos y eventos SIFEN de FACTPY, sin salir de la aplicación
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {factpy?.available ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Conectado
                </span>
                <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                  Habilitado
                </span>
              </>
            ) : factpy?.enabled && !factpy.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Falta recordID
              </span>
            ) : factpy?.enabled ? (
              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                Configuración incompleta
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                Deshabilitado
              </span>
            )}
          </div>
        </div>

        {factpy && (
          <p className="mb-3 text-xs text-slate-500">
            Ambiente: <span className="font-medium">{factpy.environment === "production" ? "producción" : "test"}</span>
            {" · "}API: <span className="break-all">{factpy.apiUrl}</span>
          </p>
        )}

        {factpy && !factpy.enabled && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="min-w-0">
              Emisión en espera: preparado para SIFEN; se activa con{" "}
              <span className="font-medium">FACTPY_ENABLED=true</span>. La consulta de
              documentos y eventos sigue disponible.
            </p>
          </div>
        )}

        <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              ["documentos", "Documentos"],
              ["eventos", "Eventos"],
              ["otros", "Otros documentos"],
            ] as const
          ).map(([clave, etiqueta]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setTab(clave)}
              aria-current={tab === clave ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-md px-3 text-sm font-medium sm:px-4 ${
                tab === clave
                  ? "bg-[var(--primary-600)] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        {tab === "documentos" && (
          <>
            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-end">
                <div className="min-w-0">
                  <label htmlFor="filtro-estado" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Estado
                  </label>
                  <select
                    id="filtro-estado"
                    value={filtroEstado}
                    onChange={(evento) => setFiltroEstado(evento.target.value)}
                    className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                  >
                    <option value="">Todos los estados</option>
                    {ESTADOS_DOCUMENTO.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label htmlFor="filtro-tipo" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Tipo de documento
                  </label>
                  <select
                    id="filtro-tipo"
                    value={filtroTipo}
                    onChange={(evento) => setFiltroTipo(evento.target.value)}
                    className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                  >
                    <option value="">Todos los tipos</option>
                    {TIPOS_DOCUMENTO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {ETIQUETAS_TIPO[tipo]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={sincronizarEstados}
                  disabled={sincronizando}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 lg:ml-auto"
                >
                  {sincronizando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar estados
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="divide-y divide-slate-200 lg:hidden">
                {cargandoDocumentos ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
                ) : documentos.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">Todavía no hay documentos electrónicos</p>
                  </div>
                ) : (
                  documentos.map((documento) => (
                    <div key={documento.id} className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                              {numeroDocumento(documento)}
                            </p>
                            <BadgeEstado estado={documento.status} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {ETIQUETAS_TIPO[documento.kind] ?? documento.kind} ·{" "}
                            {fechaTexto(documento.fechaEmision)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-900">
                          {formatGuarani(totalDocumento(documento))}
                        </p>
                      </div>
                      <p className="truncate text-xs text-slate-600">
                        Cliente: {documento.customer?.name || "Sin cliente"}
                      </p>
                      <p className="break-all text-xs text-slate-500">
                        CDC: <span className="break-all">{resumir(documento.cdc)}</span>
                      </p>
                      {documento.ultimoError && (
                        <p className="break-all rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">
                          {documento.ultimoError}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">Intentos: {documento.intentos}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void abrirDetalle(documento)}
                          className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" /> Ver detalle
                        </button>
                        {documento.kude && (
                          <button
                            type="button"
                            onClick={() => abrirArchivo(documento, "kude")}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <FileDown className="h-4 w-4" /> Ver KUDE
                          </button>
                        )}
                        {documento.xmlLink && (
                          <button
                            type="button"
                            onClick={() => abrirArchivo(documento, "xml")}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <FileText className="h-4 w-4" /> XML
                          </button>
                        )}
                        {documento.status !== "APROBADO" && (
                          <button
                            type="button"
                            onClick={() => void reenviar(documento)}
                            disabled={reenviandoId === documento.id}
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--primary-600)] px-3 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                          >
                            {reenviandoId === documento.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Reenviar
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className={columnaClase}>Número</th>
                      <th className={columnaClase}>Tipo</th>
                      <th className={columnaClase}>Cliente</th>
                      <th className={columnaClase}>Total</th>
                      <th className={columnaClase}>CDC</th>
                      <th className={columnaClase}>Estado</th>
                      <th className={columnaClase}>Detalle</th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cargandoDocumentos ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                          Cargando...
                        </td>
                      </tr>
                    ) : documentos.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                          Todavía no hay documentos electrónicos
                        </td>
                      </tr>
                    ) : (
                      documentos.map((documento) => (
                        <tr key={documento.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                            {numeroDocumento(documento)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {ETIQUETAS_TIPO[documento.kind] ?? documento.kind}
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-sm text-slate-600">
                            {documento.customer?.name || "-"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-900">
                            {formatGuarani(totalDocumento(documento))}
                          </td>
                          <td className="max-w-[190px] break-all px-4 py-3 text-xs text-slate-600">
                            {resumir(documento.cdc)}
                          </td>
                          <td className="px-4 py-3">
                            <BadgeEstado estado={documento.status} />
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            <p>Intentos: {documento.intentos}</p>
                            {documento.ultimoError && (
                              <p className="max-w-[200px] break-all text-rose-700">
                                {resumir(documento.ultimoError, 40)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => void abrirDetalle(documento)}
                                aria-label={`Ver detalle del documento ${numeroDocumento(documento)}`}
                                title="Ver detalle"
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {documento.kude && (
                                <button
                                  type="button"
                                  onClick={() => abrirArchivo(documento, "kude")}
                                  aria-label={`Ver KUDE del documento ${numeroDocumento(documento)}`}
                                  title="Ver KUDE"
                                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                                >
                                  <FileDown className="h-4 w-4" />
                                </button>
                              )}
                              {documento.xmlLink && (
                                <button
                                  type="button"
                                  onClick={() => abrirArchivo(documento, "xml")}
                                  aria-label={`Ver XML del documento ${numeroDocumento(documento)}`}
                                  title="XML"
                                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                                >
                                  <FileText className="h-4 w-4" />
                                </button>
                              )}
                              {documento.status !== "APROBADO" && (
                                <button
                                  type="button"
                                  onClick={() => void reenviar(documento)}
                                  disabled={reenviandoId === documento.id}
                                  aria-label={`Reenviar documento ${numeroDocumento(documento)}`}
                                  title="Reenviar"
                                  className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                                >
                                  {reenviandoId === documento.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
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
          </>
        )}

        {tab === "eventos" && (
          <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={abrirNuevoEvento}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Nuevo evento
              </button>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="divide-y divide-slate-200 lg:hidden">
                {cargandoEventos ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-500">Cargando...</div>
                ) : eventos.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">Todavía no hay eventos</p>
                  </div>
                ) : (
                  eventos.map((evento) => (
                    <div key={evento.id} className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {evento.tipo === "CANCELACION"
                              ? "Cancelación"
                              : evento.tipo === "INUTILIZACION"
                                ? "Inutilización"
                                : "Nominación"}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {evento.document?.numero
                              ? `Doc. ${evento.document.numero}`
                              : "Sin documento"} · {fechaTexto(evento.createdAt)}
                          </p>
                        </div>
                        <BadgeEstado estado={evento.status} />
                      </div>
                      {evento.cdc && (
                        <p className="break-all text-xs text-slate-600">
                          CDC: <span className="break-all">{resumir(evento.cdc)}</span>
                        </p>
                      )}
                      {(evento.desde || evento.hasta) && (
                        <p className="text-xs text-slate-600">
                          Rango: {evento.desde || "-"} – {evento.hasta || "-"}{" "}
                          {evento.timbrado ? `· Timbrado ${evento.timbrado}` : ""}
                        </p>
                      )}
                      {evento.motivo && (
                        <p className="break-all text-xs text-slate-600">Motivo: {evento.motivo}</p>
                      )}
                      {evento.nombre && (
                        <p className="truncate text-xs text-slate-600">
                          {evento.nombre} {evento.ruc ? `· RUC ${evento.ruc}` : ""}
                        </p>
                      )}
                      {evento.code && <p className="text-xs text-slate-500">Código: {evento.code}</p>}
                      {evento.ultimoError && (
                        <p className="break-all rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">
                          {evento.ultimoError}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        Intentos: {evento.intentos} · Respuesta: {fechaTexto(evento.fechaRespuesta)}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className={columnaClase}>Tipo</th>
                      <th className={columnaClase}>Documento</th>
                      <th className={columnaClase}>CDC / Rango</th>
                      <th className={columnaClase}>Detalle</th>
                      <th className={columnaClase}>Estado</th>
                      <th className={columnaClase}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cargandoEventos ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                          Cargando...
                        </td>
                      </tr>
                    ) : eventos.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                          Todavía no hay eventos
                        </td>
                      </tr>
                    ) : (
                      eventos.map((evento) => (
                        <tr key={evento.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                            {evento.tipo}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {evento.document?.numero || "-"}
                          </td>
                          <td className="max-w-[200px] break-all px-4 py-3 text-xs text-slate-600">
                            {evento.cdc
                              ? resumir(evento.cdc)
                              : evento.desde || evento.hasta
                                ? `${evento.desde || "-"} – ${evento.hasta || "-"}`
                                : "-"}
                          </td>
                          <td className="max-w-[240px] px-4 py-3 text-xs text-slate-600">
                            <p className="truncate">{evento.motivo || evento.nombre || "-"}</p>
                            {evento.ultimoError && (
                              <p className="break-all text-rose-700">{resumir(evento.ultimoError, 40)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <BadgeEstado estado={evento.status} />
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                            {fechaTexto(evento.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "otros" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-5 w-5 text-slate-500" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-medium text-slate-900">Otros documentos</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Emití autofacturas, notas de remisión, anticipos y facturas de exportación desde
                  un único formulario. Los montos se expresan en Guaraníes, como enteros.
                </p>
                {factpy && !factpy.available && (
                  <p className="mt-2 text-xs text-amber-700">
                    La emisión está en espera hasta completar la configuración del servidor.
                  </p>
                )}
                <button
                  type="button"
                  onClick={abrirNuevoManual}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Emitir documento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Detalle del documento electrónico"
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="truncate text-base font-medium text-slate-900 sm:text-lg">
                  Detalle del documento
                </h2>
                <p className="truncate text-xs text-slate-500">{numeroDocumento(detalle)}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                aria-label="Cerrar detalle"
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cargandoDetalle ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500 sm:px-6">
                Cargando detalle...
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <BadgeEstado estado={detalle.status} />
                  <span className="text-xs text-slate-500">
                    {ETIQUETAS_TIPO[detalle.kind] ?? detalle.kind}
                  </span>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Número</dt>
                    <dd className="break-all text-sm text-slate-900">{numeroDocumento(detalle)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Receipt ID</dt>
                    <dd className="break-all text-sm text-slate-900">{detalle.receiptid}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Cliente</dt>
                    <dd className="truncate text-sm text-slate-900">
                      {detalle.customer?.name || "-"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Venta</dt>
                    <dd className="truncate text-sm text-slate-900">
                      {detalle.sale?.invoiceNumber || detalle.sale?.number || "-"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Total</dt>
                    <dd className="text-sm text-slate-900">
                      {formatGuarani(detalle.payment?.amount ?? detalle.sale?.total ?? 0)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Fecha de emisión</dt>
                    <dd className="text-sm text-slate-900">{fechaTexto(detalle.fechaEmision)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Timbrado</dt>
                    <dd className="break-all text-sm text-slate-900">{detalle.timbrado || "-"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Número de transacción</dt>
                    <dd className="break-all text-sm text-slate-900">{detalle.numeroTr || "-"}</dd>
                  </div>
                  <div className="col-span-full min-w-0">
                    <dt className="text-xs text-slate-500">CDC</dt>
                    <dd className="break-all text-sm text-slate-900">{detalle.cdc || "-"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Código / mensaje</dt>
                    <dd className="break-all text-sm text-slate-900">
                      {[detalle.code, detalle.mensaje].filter(Boolean).join(" · ") || "-"}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Documento</dt>
                    <dd className="break-all text-sm text-slate-900">{detalle.documento || "-"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Intentos</dt>
                    <dd className="text-sm text-slate-900">{detalle.intentos}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-slate-500">Enviado / aprobado</dt>
                    <dd className="text-sm text-slate-900">
                      {fechaTexto(detalle.enviadoAt)} / {fechaTexto(detalle.aprobadoAt)}
                    </dd>
                  </div>
                  {detalle.ultimoError && (
                    <div className="col-span-full min-w-0">
                      <dt className="text-xs text-slate-500">Último error</dt>
                      <dd className="break-all rounded bg-rose-50 px-2 py-1 text-sm text-rose-700">
                        {detalle.ultimoError}
                      </dd>
                    </div>
                  )}
                </dl>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-slate-900">
                    Eventos ({detalle.events.length})
                  </h3>
                  {detalle.events.length === 0 ? (
                    <p className="text-xs text-slate-500">Todavía no hay eventos</p>
                  ) : (
                    <div className="space-y-2">
                      {detalle.events.map((evento) => (
                        <div
                          key={evento.id}
                          className="rounded-md border border-slate-200 p-2 text-xs text-slate-600"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-slate-900">{evento.tipo}</span>
                            <BadgeEstado estado={evento.status} />
                          </div>
                          <p className="break-all">CDC: {evento.cdc || "-"}</p>
                          {evento.motivo && <p className="break-all">Motivo: {evento.motivo}</p>}
                          {evento.ultimoError && (
                            <p className="break-all text-rose-700">{evento.ultimoError}</p>
                          )}
                          <p className="text-slate-500">{fechaTexto(evento.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  {detalle.kude && (
                    <button
                      type="button"
                      onClick={() => abrirArchivo(detalle, "kude")}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileDown className="h-4 w-4" /> Ver KUDE
                    </button>
                  )}
                  {detalle.xmlLink && (
                    <button
                      type="button"
                      onClick={() => abrirArchivo(detalle, "xml")}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4" /> XML
                    </button>
                  )}
                  {detalle.status !== "APROBADO" && (
                    <button
                      type="button"
                      onClick={() => void reenviar(detalle)}
                      disabled={reenviandoId === detalle.id}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-[var(--primary-600)] px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {reenviandoId === detalle.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Reenviar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {mostrarEvento && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nuevo evento"
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-base font-medium text-slate-900 sm:text-lg">Nuevo evento</h2>
              <button
                type="button"
                onClick={() => setMostrarEvento(false)}
                aria-label="Cerrar formulario de evento"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <label htmlFor="tipo-evento" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tipo de evento
                </label>
                <select
                  id="tipo-evento"
                  value={formEvento.tipo}
                  onChange={(evento) =>
                    setFormEvento((prev) => ({
                      ...prev,
                      tipo: evento.target.value as TipoEvento,
                    }))
                  }
                  className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                >
                  <option value="CANCELACION">Cancelación</option>
                  <option value="INUTILIZACION">Inutilización</option>
                  <option value="NOMINACION">Nominación</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {CAMPOS_POR_EVENTO[formEvento.tipo].map((campo) => (
                  <div key={campo.clave} className="min-w-0">
                    <label
                      htmlFor={`evento-${campo.clave}`}
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      {campo.etiqueta} {campo.requerido ? "*" : ""}
                    </label>
                    <input
                      id={`evento-${campo.clave}`}
                      type="text"
                      value={formEvento[campo.clave]}
                      onChange={(evento) =>
                        setFormEvento((prev) =>
                          ({ ...prev, [campo.clave]: evento.target.value }) as FormEvento
                        )
                      }
                      placeholder={campo.placeholder}
                      className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                    />
                  </div>
                ))}
              </div>

              <p className="flex items-start gap-1.5 text-xs text-slate-500">
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                El evento se registra y se envía a FACTPY; su estado se actualizará con la
                sincronización.
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setMostrarEvento(false)}
                className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void crearEvento()}
                disabled={guardandoEvento}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {guardandoEvento && <Loader2 className="h-4 w-4 animate-spin" />}
                Registrar evento
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarManual && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Emitir otro documento"
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
              <h2 className="text-base font-medium text-slate-900 sm:text-lg">Otros documentos</h2>
              <button
                type="button"
                onClick={() => setMostrarManual(false)}
                aria-label="Cerrar formulario de documento"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-4 sm:p-6">
              <div>
                <label htmlFor="tipo-manual" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tipo de documento
                </label>
                <select
                  id="tipo-manual"
                  value={formManual.tipo}
                  onChange={(evento) =>
                    setFormManual((prev) => ({
                      ...prev,
                      tipo: evento.target.value as TipoManual,
                    }))
                  }
                  className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                >
                  <option value="AUTOFACTURA">Autofactura</option>
                  <option value="NOTA_REMISION">Nota de remisión</option>
                  <option value="ANTICIPO">Anticipo</option>
                  <option value="FACTURA_EXPORTACION">Factura de exportación</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor="manual-nombre" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Nombre del cliente *
                  </label>
                  <input
                    id="manual-nombre"
                    type="text"
                    value={formManual.nombre}
                    onChange={(evento) =>
                      setFormManual((prev) => ({ ...prev, nombre: evento.target.value }))
                    }
                    className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                  />
                </div>
                <div className="min-w-0">
                  <label htmlFor="manual-ruc" className="mb-1.5 block text-sm font-medium text-slate-700">
                    RUC
                  </label>
                  <input
                    id="manual-ruc"
                    type="text"
                    value={formManual.ruc}
                    onChange={(evento) =>
                      setFormManual((prev) => ({ ...prev, ruc: evento.target.value }))
                    }
                    className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                  />
                </div>
              </div>

              <div className="rounded-md border border-slate-200 p-3">
                <p className="mb-3 text-sm font-medium text-slate-900">Ítem</p>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="manual-descripcion-item" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Descripción *
                    </label>
                    <input
                      id="manual-descripcion-item"
                      type="text"
                      value={formManual.descripcionItem}
                      onChange={(evento) =>
                        setFormManual((prev) => ({
                          ...prev,
                          descripcionItem: evento.target.value,
                        }))
                      }
                      className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="min-w-0">
                      <label htmlFor="manual-codigo" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Código
                      </label>
                      <input
                        id="manual-codigo"
                        type="text"
                        value={formManual.codigo}
                        onChange={(evento) =>
                          setFormManual((prev) => ({ ...prev, codigo: evento.target.value }))
                        }
                        className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="manual-cantidad" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Cantidad
                      </label>
                      <input
                        id="manual-cantidad"
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={formManual.cantidad}
                        onChange={(evento) =>
                          setFormManual((prev) => ({ ...prev, cantidad: evento.target.value }))
                        }
                        className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="manual-precio" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Precio unitario (PYG)
                      </label>
                      <input
                        id="manual-precio"
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={formManual.precioUnitario}
                        onChange={(evento) =>
                          setFormManual((prev) => ({
                            ...prev,
                            precioUnitario: evento.target.value,
                          }))
                        }
                        className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">
                    Total del ítem:{" "}
                    <span className="font-semibold text-slate-900">
                      {formatGuarani(
                        (Number.parseInt(formManual.cantidad, 10) || 0) *
                          (Number.parseInt(formManual.precioUnitario, 10) || 0)
                      )}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="manual-descripcion" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Descripción general
                </label>
                <input
                  id="manual-descripcion"
                  type="text"
                  value={formManual.descripcion}
                  onChange={(evento) =>
                    setFormManual((prev) => ({ ...prev, descripcion: evento.target.value }))
                  }
                  className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                />
              </div>

              <div>
                <label htmlFor="manual-campos" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Campos específicos (JSON)
                </label>
                <textarea
                  id="manual-campos"
                  rows={4}
                  value={formManual.campos}
                  onChange={(evento) =>
                    setFormManual((prev) => ({ ...prev, campos: evento.target.value }))
                  }
                  placeholder={AYUDA_CAMPOS[formManual.tipo]}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary-600)]"
                />
                <p className="mt-1 break-all text-xs text-slate-500">
                  {AYUDA_CAMPOS[formManual.tipo]}
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={() => setMostrarManual(false)}
                className="min-h-11 flex-1 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void emitirManual()}
                disabled={guardandoManual}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[var(--primary-600)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
              >
                {guardandoManual && <Loader2 className="h-4 w-4 animate-spin" />}
                Emitir
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
