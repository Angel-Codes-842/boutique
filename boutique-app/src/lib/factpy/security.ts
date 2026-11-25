import { randomInt, randomUUID } from "node:crypto";

/** Código de seguridad aleatorio de 9 dígitos, único por documento. */
export function generarCodigoSeguridad(): string {
  let codigo = "";
  for (let i = 0; i < 9; i += 1) {
    codigo += randomInt(0, 10).toString();
  }
  return codigo;
}

/** receiptid estable y único: prefijo + ID interno + sufijo aleatorio corto. */
export function generarReceiptid(prefijo: string, id: string): string {
  const slug = prefijo.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase() || "DOC";
  const corto = randomUUID().replace(/-/g, "").slice(0, 10);
  return `${slug}-${id.replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}-${corto}`;
}

/** Últimos 7 dígitos del número de factura interno "001-001-0000001". */
export function numeroDesdeFactura(invoiceNumber: string | null | undefined): string | null {
  if (!invoiceNumber) return null;
  const match = invoiceNumber.match(/(\d{7})$/);
  return match ? match[1] : null;
}

export function padNumero(numero: number): string {
  if (!Number.isSafeInteger(numero) || numero < 1 || numero > 9_999_999) {
    throw new Error("Número de documento fuera de rango (7 dígitos)");
  }
  return String(numero).padStart(7, "0");
}

export function padCodigo(codigo: string): string {
  const value = codigo.trim();
  if (!/^\d{1,3}$/.test(value)) {
    throw new Error("Establecimiento y punto deben tener entre 1 y 3 dígitos");
  }
  return value.padStart(3, "0");
}
