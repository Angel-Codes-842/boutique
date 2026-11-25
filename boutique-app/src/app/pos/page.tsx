"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Save, Printer, ShoppingCart, Trash2, X, User, UserPlus } from "lucide-react";
import { formatGuarani } from "@/lib/utils";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";

interface Product {
  id: string;
  code: string;
  barcode?: string | null;
  name: string;
  price: number;
  category?: { name: string } | null;
  brand?: { name: string } | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Cliente {
  id: string;
  name: string;
  document?: string;
  phone?: string;
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [codigo, setCodigo] = useState("");
  const [productos, setProductos] = useState<Product[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showBuscar, setShowBuscar] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [showCliente, setShowCliente] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<any>(null);
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ name: "", document: "", phone: "" });
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [descuento, setDescuento] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState<"TICKET" | "FACTURA">("TICKET");
  const [mobileTab, setMobileTab] = useState<"carrito" | "productos" | "cobro">("carrito");
  const [storeConfig, setStoreConfig] = useState<any>(null);

  const fetchClientes = () => {
    fetch("/api/clientes")
      .then((res) => res.json())
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/caja")
      .then((res) => res.json())
      .then((data) => setCajaAbierta(!!data && data.status === "ABIERTA"))
      .catch(() => setCajaAbierta(false));

    fetch("/api/productos")
      .then((res) => res.json())
      .then((data) => setProductos(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setStoreConfig(data || null))
      .catch(() => {});

    fetchClientes();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "F2") {
        e.preventDefault();
        setShowBuscar(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowBuscar(true);
      }
      if (e.key === "/" && !typing && !showBuscar && !showCliente && !showNuevoCliente) {
        e.preventDefault();
        const input = document.getElementById("codigo-producto") as HTMLInputElement | null;
        input?.focus();
      }
      if (e.key === "Escape") {
        setShowBuscar(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showBuscar, showCliente, showNuevoCliente]);

  const agregarPorCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    const q = codigo.trim();
    if (!q) return;
    const exact = productos.find((p) => p.code.toLowerCase() === q.toLowerCase() || (p.barcode || "").toLowerCase() === q.toLowerCase());
    if (exact) {
      addToCart(exact);
      setCodigo("");
      return;
    }
    const matches = productos.filter((p) => coincideProducto(p, q));
    if (matches.length === 1) {
      addToCart(matches[0]);
      setCodigo("");
      return;
    }
    setBusqueda(q);
    setShowBuscar(true);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowBuscar(false);
    setBusqueda("");
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const descuentoNum = Number(descuento) || 0;
  const total = Math.max(0, subtotal - descuentoNum);

  const normalizarBusqueda = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

  const coincideProducto = (p: Product, q: string) => {
    const nq = normalizarBusqueda(q);
    if (!nq) return true;
    const campos = [p.name, p.code, p.barcode || "", p.category?.name || "", p.brand?.name || ""];
    return campos.some((c) => normalizarBusqueda(c).includes(nq));
  };

  const filteredBuscar = productos.filter((p) => coincideProducto(p, busqueda));

  const filteredClientes = clientes.filter(
    (c) =>
      c.name.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
      (c.document && c.document.toLowerCase().includes(busquedaCliente.toLowerCase()))
  );

  const recibido = Number(montoRecibido) || 0;
  const vuelto = recibido - total;

  const imprimirComprobante = (venta: any) => {
    const esFactura = (venta.documentType || tipoComprobante) === "FACTURA";
    const fecha = new Date(venta.createdAt || Date.now()).toLocaleString("es-PY");
    const items = Array.isArray(venta.items) ? venta.items : cart.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
      product: { name: item.product.name },
    }));
    const itemsHtml = items
      .map((item: any) => `<tr><td>${item.quantity}</td><td>${item.product?.name || "-"}</td><td style="text-align:right">${Number(item.unitPrice || 0).toLocaleString("es-PY")}</td><td style="text-align:right">${Number(item.total ?? (item.quantity * (item.unitPrice || 0))).toLocaleString("es-PY")}</td></tr>`)
      .join("");
    const cfg = storeConfig || {};
    const nombreTienda = (cfg.name || "BOUTIQUE POS").toUpperCase();
    const nro = esFactura ? (venta.invoiceNumber || venta.number || "-") : (venta.number || "-");
    const clienteNombre = venta.customer?.name || clienteSeleccionado?.name || (esFactura ? "CONSUMIDOR FINAL" : "Sin cliente");
    const clienteDoc = venta.customer?.document || clienteSeleccionado?.document;
    const metodo = venta.paymentMethod || metodoPago;
    const sub = Number(venta.subtotal ?? subtotal);
    const desc = Number(venta.discount ?? descuentoNum);
    const tot = Number(venta.total ?? total);
    const pagado = Number(venta.paidAmount ?? recibido);
    const vueltoCalc = Number(venta.changeAmount ?? Math.max(0, pagado - tot));
    const saldo = Math.max(0, tot - pagado);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esFactura ? "Factura" : "Ticket"} ${nro}</title>
<style>
${esFactura ? "@page { size: A4; margin: 15mm; } body{font-family:Arial,sans-serif;font-size:11px;margin:0;padding:0}" : "@page { size: 80mm auto; margin: 0; } body{font-family:monospace;font-size:11px;width:72mm;margin:0;padding:4mm}"}
h2{margin:3px 0;font-size:13px} p{margin:1px 0} hr{border:none;border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse;margin:6px 0} th,td{padding:2px;font-size:10px} .total{font-weight:bold;font-size:12px}
</style></head><body>
${esFactura ? `
<div style="display:flex;justify-content:space-between;gap:12px">
  <div><h2>${nombreTienda}</h2>${cfg.ruc ? `<p>RUC: ${cfg.ruc}</p>` : ""}${cfg.address ? `<p>${cfg.address}</p>` : ""}${cfg.phone ? `<p>Tel: ${cfg.phone}</p>` : ""}${cfg.timbrado ? `<p><strong>Timbrado N°:</strong> ${cfg.timbrado}</p>` : ""}${cfg.timbradoVigencia ? `<p><strong>Vigencia:</strong> ${new Date(cfg.timbradoVigencia).toLocaleDateString("es-PY")}</p>` : ""}</div>
  <div style="border:1px solid #000;padding:8px;text-align:center;min-width:160px"><p style="font-weight:bold">FACTURA</p><p style="font-size:12px;font-weight:bold">${nro}</p><p style="font-size:9px">Sin valor fiscal</p></div>
</div><hr>
<p><strong>Fecha:</strong> ${fecha}</p><p><strong>Cliente:</strong> ${clienteNombre}</p>${clienteDoc ? `<p><strong>RUC/CI:</strong> ${clienteDoc}</p>` : ""}<p><strong>Condición:</strong> ${metodo === "CREDITO" ? "CRÉDITO" : "CONTADO"}</p><p><strong>Forma de pago:</strong> ${metodo}</p>
<hr><table><thead><tr><th style="text-align:left">Cant</th><th style="text-align:left">Descripción</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr>
<p style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>${sub.toLocaleString("es-PY")} Gs.</span></p>${desc > 0 ? `<p style="display:flex;justify-content:space-between"><span>Descuento:</span><span>-${desc.toLocaleString("es-PY")} Gs.</span></p>` : ""}<p class="total" style="display:flex;justify-content:space-between"><span>TOTAL:</span><span>${tot.toLocaleString("es-PY")} Gs.</span></p>
` : `
<h2 style="text-align:center">${nombreTienda}</h2><p style="text-align:center">Comprobante Interno</p><hr>
<p><strong>Ticket:</strong> ${nro}</p><p><strong>Fecha:</strong> ${fecha}</p><p><strong>Cliente:</strong> ${clienteNombre}</p><p><strong>Forma de pago:</strong> ${metodo}</p><hr>
<table><thead><tr><th style="text-align:left">Cant</th><th style="text-align:left">Producto</th><th style="text-align:right">P.U.</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr>
<p style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>${sub.toLocaleString("es-PY")} Gs.</span></p>${desc > 0 ? `<p style="display:flex;justify-content:space-between"><span>Descuento:</span><span>-${desc.toLocaleString("es-PY")} Gs.</span></p>` : ""}<p class="total" style="display:flex;justify-content:space-between"><span>TOTAL:</span><span>${tot.toLocaleString("es-PY")} Gs.</span></p>
${metodo === "EFECTIVO" ? `<p style="display:flex;justify-content:space-between"><span>Recibido:</span><span>${pagado.toLocaleString("es-PY")} Gs.</span></p><p style="display:flex;justify-content:space-between"><span>Vuelto:</span><span>${vueltoCalc.toLocaleString("es-PY")} Gs.</span></p>` : ""}
${metodo === "CREDITO" ? `<p style="display:flex;justify-content:space-between"><span>Abono:</span><span>${pagado.toLocaleString("es-PY")} Gs.</span></p><p style="display:flex;justify-content:space-between"><span>Saldo:</span><span>${saldo.toLocaleString("es-PY")} Gs.</span></p>` : ""}
<hr><p style="text-align:center;margin-top:15px">¡Gracias por su compra!</p>
`}
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
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

  const cobrar = async () => {
    if (cart.length === 0) return;
    if (descuentoNum > subtotal) {
      toast.error("El descuento no puede ser mayor al subtotal");
      return;
    }
    if (metodoPago === "EFECTIVO" && recibido < total) {
      toast.error("El monto recibido es menor al total");
      return;
    }
    if (metodoPago === "CREDITO" && !clienteSeleccionado) {
      toast.error("Debe seleccionar un cliente para venta a crédito");
      return;
    }
    if (tipoComprobante === "FACTURA" && !clienteSeleccionado) {
      toast.error("Para emitir factura debe seleccionar un cliente");
      return;
    }

    setProcesando(true);
    try {
      const paidAmount = metodoPago === "EFECTIVO" ? recibido : metodoPago === "CREDITO" ? (recibido || 0) : total;
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
          customerId: clienteSeleccionado?.id || null,
          paymentMethod: metodoPago,
          paidAmount,
          discount: descuentoNum,
          documentType: tipoComprobante,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Venta registrada correctamente");
        setUltimaVenta({ ...data, items: cart });
        imprimirComprobante({ ...data, items: cart });
        setCart([]);
        setMontoRecibido("");
        setMetodoPago("EFECTIVO");
        setClienteSeleccionado(null);
        setDescuento("");
        setTipoComprobante("TICKET");
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al registrar la venta");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setProcesando(false);
    }
  };

  const nuevaVenta = () => {
    setCart([]);
    setCodigo("");
    setMontoRecibido("");
    setMetodoPago("EFECTIVO");
    setClienteSeleccionado(null);
    setDescuento("");
    setTipoComprobante("TICKET");
    toast.info("Nueva venta iniciada");
  };

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setGuardandoCliente(true);
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nuevoCliente.name,
          document: nuevoCliente.document || null,
          phone: nuevoCliente.phone || null,
        }),
      });
      if (res.ok) {
        const cliente = await res.json();
        toast.success("Cliente creado correctamente");
        fetchClientes();
        setClienteSeleccionado(cliente);
        setShowNuevoCliente(false);
        setShowCliente(false);
        setNuevoCliente({ name: "", document: "", phone: "" });
      } else {
        const err = await res.json();
        toast.error(err.error || "Error al crear cliente");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setGuardandoCliente(false);
    }
  };

  const imprimirYGuardar = () => {
    if (cart.length === 0) {
      toast.error("No hay productos para imprimir");
      return;
    }
    if (metodoPago === "EFECTIVO" && recibido < total && cart.length > 0) {
      toast.error("Complete el cobro primero o ingrese el monto recibido");
      return;
    }
    if (ultimaVenta) {
      imprimirComprobante(ultimaVenta);
    } else {
      imprimirComprobante({ number: "SIN-GUARDAR", documentType: tipoComprobante, items: cart, subtotal, discount: descuentoNum, total, paidAmount: metodoPago === "EFECTIVO" ? recibido : metodoPago === "CREDITO" ? (recibido || 0) : total, paymentMethod: metodoPago, customer: clienteSeleccionado });
    }
  };

  return (
    <AppShell>
      <div className="h-full overflow-auto p-2 sm:p-3 lg:p-4">
          {cajaAbierta === false && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">No hay caja abierta</p>
                <p className="text-xs text-amber-700">Debe abrir la caja para poder realizar ventas</p>
              </div>
              <a href="/caja" className="px-3 py-1.5 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700">Ir a Caja</a>
            </div>
          )}
          <div className="mb-3 lg:mb-4 flex items-center justify-between">
            <h1 className="hidden text-xl font-semibold text-slate-900 lg:block">Punto de Venta</h1>
            <div className="flex items-center gap-1.5 lg:gap-2">
              <select
                value={tipoComprobante}
                onChange={(e) => setTipoComprobante(e.target.value as "TICKET" | "FACTURA")}
                className="rounded-md border border-slate-300 px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm focus:outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--primary-600)" } as any}
              >
                <option value="TICKET">Ticket</option>
                <option value="FACTURA">Factura</option>
              </select>
              <button
                onClick={() => setShowBuscar(true)}
                className="hidden lg:inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                title="F2 o Ctrl+K"
              >
                <Search className="h-4 w-4" />
                Buscar producto (F2)
              </button>
              <button
                onClick={nuevaVenta}
                className="inline-flex items-center gap-1 lg:gap-2 rounded-md border border-slate-300 px-2 lg:px-3 py-1 lg:py-1.5 text-xs lg:text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Nueva venta</span>
              </button>
              <button onClick={imprimirYGuardar} className="hidden lg:inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Save className="h-4 w-4" />
                Guardar
              </button>
              <button onClick={imprimirYGuardar} className="hidden lg:inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Printer className="h-4 w-4" />
                Imprimir y guardar
              </button>
            </div>
          </div>

          <div className="mb-3 lg:mb-4 flex items-center gap-2 lg:gap-3">
            <form onSubmit={agregarPorCodigo} className="flex flex-1 gap-2">
              <input
                id="codigo-producto"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Código / buscar rápido... ( / para enfocar )"
                className="flex-1 rounded-md border border-slate-300 px-2 lg:px-3 py-2 text-sm focus:outline-none focus:ring-1"
                style={{ "--tw-ring-color": "var(--primary-600)" } as any}
              />
              <button
                type="submit"
                className="rounded-md px-3 lg:px-4 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--primary-600)" }}
              >
                Agregar
              </button>
            </form>
            <button
              onClick={() => setShowCliente(true)}
              className="inline-flex items-center gap-1.5 lg:gap-2 rounded-md border border-slate-300 px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-slate-700 hover:bg-slate-50 max-w-[140px] lg:max-w-none truncate"
            >
              <User className="h-3.5 w-3.5 lg:h-4 lg:w-4 flex-shrink-0" />
              <span className="truncate">{clienteSeleccionado ? clienteSeleccionado.name : "Sin cliente"}</span>
            </button>
            <button
              onClick={() => setShowBuscar(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>

          <div className="lg:hidden mb-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {[
              ["carrito", `Carrito (${cart.length})`],
              ["productos", "Productos"],
              ["cobro", "Cobro"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMobileTab(key as "carrito" | "productos" | "cobro")}
                className={`rounded-md px-2 py-2 text-xs font-medium ${mobileTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="lg:grid lg:grid-cols-3 lg:gap-4">
            <div className={`flex flex-col gap-4 lg:col-span-2 ${mobileTab === "cobro" ? "hidden lg:flex" : ""}`}>
              <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${mobileTab !== "carrito" ? "hidden lg:block" : ""}`}>
                <div className="px-3 lg:px-4 py-2 lg:py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-900">Carrito ({cart.length})</h2>
                  <button
                    onClick={() => setShowBuscar(true)}
                    className="text-xs text-slate-600 hover:text-slate-900"
                  >
                    Agregar más (F2)
                  </button>
                </div>
                <div className="overflow-auto max-h-[calc(100dvh-340px)] lg:max-h-[calc(100vh-320px)]">
                  <div className="lg:hidden divide-y divide-slate-200">
                    {cart.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">
                        <ShoppingCart className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                        Carrito vacío
                      </div>
                    ) : (
                      cart.map((item) => (
                        <div key={item.product.id} className="p-3 flex gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">{item.product.name}</div>
                            <div className="text-xs text-slate-500 mb-2">{formatGuarani(item.product.price)}</div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))} className="w-7 h-7 rounded-md border border-slate-300 flex items-center justify-center">-</button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-7 h-7 rounded-md border border-slate-300 flex items-center justify-center">+</button>
                              <button onClick={() => removeFromCart(item.product.id)} className="ml-auto text-red-600 p-1"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{formatGuarani(item.product.price * item.quantity)}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Producto</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Precio</th>
                          <th className="text-center px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Cantidad</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Subtotal</th>
                          <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {cart.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                              <ShoppingCart className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                              No hay productos agregados
                            </td>
                          </tr>
                        ) : (
                          cart.map((item) => (
                            <tr key={item.product.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm font-mono text-slate-900">{item.product.code}</td>
                              <td className="px-4 py-2 text-sm text-slate-900">{item.product.name}</td>
                              <td className="px-4 py-2 text-sm text-slate-900 text-right">{formatGuarani(item.product.price)}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => updateQuantity(item.product.id, Number(e.target.value))}
                                    className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-center focus:outline-none focus:ring-1"
                                    style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                                    min="1"
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-slate-900 text-right">{formatGuarani(item.product.price * item.quantity)}</td>
                              <td className="px-4 py-2 text-right">
                                <button onClick={() => removeFromCart(item.product.id)} className="rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div id="productos-pos" className={`bg-white rounded-lg border border-slate-200 overflow-hidden ${mobileTab !== "productos" ? "hidden lg:block" : ""}`}>
                <div className="px-3 lg:px-4 py-2 lg:py-3 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-sm font-medium text-slate-900">Productos</h2>
                  <button onClick={() => setShowBuscar(true)} className="lg:hidden inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                    <Search className="h-3.5 w-3.5" />
                    Buscar
                  </button>
                </div>
                <div className="p-2 lg:p-3 max-h-[calc(100dvh-340px)] lg:max-h-[calc(100vh-320px)] overflow-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {productos.slice(0, 80).map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => addToCart(prod)}
                        className="p-2 lg:p-3 rounded-lg border border-slate-200 hover:border-[var(--primary-600)] hover:bg-slate-50 text-left transition-colors active:scale-[0.98]"
                      >
                        <div className="text-xs lg:text-sm font-medium text-slate-900 line-clamp-2 mb-1">{prod.name}</div>
                        <div className="text-[10px] lg:text-xs text-slate-500 font-mono mb-1 truncate">{prod.code}</div>
                        <div className="text-sm lg:text-base font-semibold text-[var(--primary-600)]">{formatGuarani(prod.price)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`lg:col-span-1 ${mobileTab !== "cobro" ? "hidden lg:block" : ""}`}>
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden lg:sticky lg:top-4">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h2 className="text-sm font-medium text-slate-900">Cobro</h2>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatGuarani(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Descuento</span>
                      <div className="flex items-center gap-1">
                        <span>₲</span>
                        <input
                          type="number"
                          value={descuento}
                          onChange={(e) => setDescuento(e.target.value)}
                          placeholder="0"
                          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm text-right focus:outline-none focus:ring-1"
                          style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-base font-semibold text-slate-900 pt-3 border-t border-slate-200">
                      <span>Total a pagar</span>
                      <span>{formatGuarani(total)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Forma de pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1"
                      style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="CREDITO">Crédito / Fiado</option>
                    </select>
                  </div>

                  {(metodoPago === "EFECTIVO" || metodoPago === "CREDITO") && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          {metodoPago === "CREDITO" ? "Abono inicial (opcional)" : "Monto recibido"}
                        </label>
                        <input
                          type="number"
                          value={montoRecibido}
                          onChange={(e) => setMontoRecibido(e.target.value)}
                          placeholder="0"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1"
                          style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                        />
                      </div>
                      {metodoPago === "EFECTIVO" && recibido >= total && total > 0 && (
                        <div className="flex justify-between text-sm p-3 rounded-md bg-green-50 border border-green-200">
                          <span className="text-green-700 font-medium">Vuelto</span>
                          <span className="font-semibold text-green-700">{formatGuarani(vuelto)}</span>
                        </div>
                      )}
                      {metodoPago === "CREDITO" && total > 0 && (
                        <div className="flex justify-between text-sm p-3 rounded-md bg-amber-50 border border-amber-200">
                          <span className="text-amber-700 font-medium">Saldo a crédito</span>
                          <span className="font-semibold text-amber-700">{formatGuarani(total - recibido)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={cobrar}
                    disabled={cart.length === 0 || procesando}
                    className="w-full rounded-md px-4 py-3 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                    style={{ backgroundColor: cart.length === 0 ? undefined : "var(--primary-600)" }}
                  >
                    {procesando ? "Procesando..." : "Cobrar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>

      {showBuscar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <div>
                <h2 className="font-medium text-slate-900">Productos</h2>
                <p className="text-xs text-slate-500">Busca por nombre, código, código de barras, categoría o marca. Atajos: F2 / Ctrl+K, Esc para cerrar.</p>
              </div>
              <button onClick={() => setShowBuscar(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full rounded-md border border-slate-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {filteredBuscar.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">No se encontraron productos</div>
              ) : (
                <div className="space-y-1">
                  {filteredBuscar.slice(0, 100).map((prod) => (
                    <button key={prod.id} onClick={() => addToCart(prod)} className="w-full flex items-center justify-between p-3 rounded-md hover:bg-slate-50 text-left border border-transparent hover:border-slate-200">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{prod.name}</div>
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {prod.code}{prod.barcode ? ` · ${prod.barcode}` : ""}{prod.category?.name ? ` · ${prod.category.name}` : ""}{prod.brand?.name ? ` · ${prod.brand.name}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-slate-900 ml-3 shrink-0">{formatGuarani(prod.price)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h2 className="font-medium text-slate-900">Seleccionar Cliente</h2>
              <button onClick={() => setShowCliente(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-200 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  placeholder="Buscar por nombre o RUC/CI..."
                  className="w-full rounded-md border border-slate-300 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                  autoFocus
                />
              </div>
              <button
                onClick={() => { setShowNuevoCliente(true); setShowCliente(false); }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-white"
                style={{ backgroundColor: "var(--primary-600)" }}
              >
                <UserPlus className="h-4 w-4" />
                Nuevo cliente rápido
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <button
                onClick={() => { setClienteSeleccionado(null); setShowCliente(false); setBusquedaCliente(""); }}
                className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-slate-50 text-left mb-1"
              >
                <UserPlus className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-900">Sin cliente</div>
                  <div className="text-xs text-slate-500">Venta al contado sin cliente registrado</div>
                </div>
              </button>
              <div className="space-y-1">
                {filteredClientes.map((cli) => (
                  <button
                    key={cli.id}
                    onClick={() => { setClienteSeleccionado(cli); setShowCliente(false); setBusquedaCliente(""); }}
                    className="w-full flex items-center justify-between p-3 rounded-md hover:bg-slate-50 text-left"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-900">{cli.name}</div>
                      <div className="text-xs text-slate-500">{cli.document ? `RUC/CI: ${cli.document}` : cli.phone || ""}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showNuevoCliente && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h2 className="font-medium text-slate-900">Nuevo Cliente Rápido</h2>
              <button onClick={() => setShowNuevoCliente(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre y Apellido *</label>
                <input
                  type="text"
                  value={nuevoCliente.name}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">RUC/CI</label>
                <input
                  type="text"
                  value={nuevoCliente.document}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, document: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  type="text"
                  value={nuevoCliente.phone}
                  onChange={(e) => setNuevoCliente({ ...nuevoCliente, phone: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--primary-600)" } as any}
                />
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-200">
              <button onClick={() => setShowNuevoCliente(false)} className="flex-1 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarNuevoCliente} disabled={guardandoCliente} className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-white disabled:bg-slate-200" style={{ backgroundColor: guardandoCliente ? undefined : "var(--primary-600)" }}>
                {guardandoCliente ? "Guardando..." : "Guardar y seleccionar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
