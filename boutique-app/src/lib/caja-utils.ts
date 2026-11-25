export interface CajaMovimientos {
  apertura?: number;
  ventas?: number;
  ingresos?: number;
  egresos?: number;
}

export function calcularTotalVentas(ventas: Array<{ total: number }> | number[] | number): number {
  if (typeof ventas === "number") {
    return ventas || 0;
  }
  if (Array.isArray(ventas)) {
    if (ventas.length === 0) return 0;
    // If elements are numbers
    if (typeof ventas[0] === "number") {
      return (ventas as number[]).reduce((sum, v) => sum + (v || 0), 0);
    }
    // If elements are objects with total
    return (ventas as Array<{ total: number }>).reduce(
      (sum, v) => sum + (v?.total || 0),
      0
    );
  }
  return 0;
}

export function calcularIngresos(
  movimientos: Array<{ type: string; amount: number }> | number
): number {
  if (typeof movimientos === "number") {
    return movimientos || 0;
  }
  if (Array.isArray(movimientos)) {
    return movimientos
      .filter((m) => m && m.type === "INGRESO")
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  }
  return 0;
}

export function calcularEgresos(
  movimientos: Array<{ type: string; amount: number }> | number
): number {
  if (typeof movimientos === "number") {
    return movimientos || 0;
  }
  if (Array.isArray(movimientos)) {
    return movimientos
      .filter((m) => m && m.type === "EGRESO")
      .reduce((sum, m) => sum + (m.amount || 0), 0);
  }
  return 0;
}

export function calcularSaldoEsperado(params: {
  apertura?: number;
  ventas?: number | Array<{ total: number }> | number[];
  ingresos?: number | Array<{ type: string; amount: number }>;
  egresos?: number | Array<{ type: string; amount: number }>;
}): number {
  const apertura = params.apertura || 0;
  const ventas = calcularTotalVentas(params.ventas as any);
  const ingresos = calcularIngresos(params.ingresos as any);
  const egresos = calcularEgresos(params.egresos as any);
  return apertura + ventas + ingresos - egresos;
}

export function calcularDiferenciaAlCerrar(
  montoContado: number,
  saldoEsperado: number
): number {
  const contado = montoContado || 0;
  const esperado = saldoEsperado || 0;
  return contado - esperado;
}
