export type SaleStatus = "PENDIENTE" | "PAGADA" | "ANULADA";

export function calcularSaldo(total: number, paidAmount: number): number {
  return total - paidAmount;
}

export function calcularEstadoVenta(total: number, paidAmount: number): SaleStatus {
  if (paidAmount >= total) {
    return "PAGADA";
  }
  return "PENDIENTE";
}

export function validarAbono(
  total: number,
  paidAmount: number,
  abono: number
): { valido: boolean; saldoPendiente: number; motivo?: string } {
  const saldoPendiente = calcularSaldo(total, paidAmount);

  if (abono <= 0) {
    return { valido: false, saldoPendiente, motivo: "El abono debe ser mayor a 0" };
  }

  if (abono > saldoPendiente) {
    return { valido: false, saldoPendiente, motivo: "El abono no puede ser mayor al saldo pendiente" };
  }

  return { valido: true, saldoPendiente };
}

export function calcularNuevoEstadoDespuesAbono(
  total: number,
  paidAmount: number,
  abono: number
): { nuevoPaidAmount: number; nuevoEstado: SaleStatus; saldoPendiente: number } {
  const saldoPendiente = calcularSaldo(total, paidAmount);
  const nuevoPaidAmount = paidAmount + abono;
  const nuevoEstado = calcularEstadoVenta(total, nuevoPaidAmount);

  return { nuevoPaidAmount, nuevoEstado, saldoPendiente };
}
