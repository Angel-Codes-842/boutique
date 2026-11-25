/**
 * Cálculo del IVA 10% incluido en precios PYG.
 * SIFEN admite hasta 8 decimales en baseGravItem / liqIvaItem: no se
 * redondea a enteros en esos dos campos.
 */

const FACTOR = 100_000_000;
const TASA = 0.1;

function redondear8(valor: number): number {
  return Math.round((valor + Number.EPSILON) * FACTOR) / FACTOR;
}

export function desglosarIva(total: number, tasa = TASA): { baseGravItem: number; liqIvaItem: number } {
  if (!Number.isFinite(total) || total < 0) {
    throw new Error("El total debe ser un número no negativo");
  }
  const baseGravItem = redondear8(total / (1 + tasa));
  const liqIvaItem = redondear8(total - baseGravItem);
  return { baseGravItem, liqIvaItem };
}

/** Redondea a 8 decimales para campos que FACTPY espera con precisión. */
export function precision8(valor: number): number {
  return redondear8(valor);
}
