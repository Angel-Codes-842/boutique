export interface ProductoConVariantes {
  variants?: Array<{ stock: number }>;
  stock?: number;
}

export interface MovimientoCantidad {
  tipo: "VENTA" | "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
}

export function validarStockSuficiente(params: {
  stockDisponible?: number;
  cantidadSolicitada: number;
  producto?: ProductoConVariantes;
  tieneVariantes?: boolean;
  variantId?: string | null;
}): { suficiente: boolean; stockDisponible: number; faltante?: number } {
  const { cantidadSolicitada, producto, tieneVariantes = false, variantId } = params;

  let stockDisponible = 0;

  if (typeof params.stockDisponible === "number") {
    stockDisponible = params.stockDisponible;
  } else if (producto) {
    if (tieneVariantes || (producto.variants && producto.variants.length > 0)) {
      if (producto.variants && producto.variants.length > 0) {
        stockDisponible = producto.variants.reduce(
          (sum, v) => sum + (v.stock || 0),
          0
        );
      } else {
        stockDisponible = producto.stock || 0;
      }
    } else {
      stockDisponible = producto.stock || 0;
    }
  }

  if (stockDisponible < cantidadSolicitada) {
    return {
      suficiente: false,
      stockDisponible,
      faltante: cantidadSolicitada - stockDisponible,
    };
  }

  return {
    suficiente: true,
    stockDisponible,
  };
}

export function calcularStockTotalPorVariantes(
  variantes: Array<{ stock: number }> = []
): number {
  if (!Array.isArray(variantes) || variantes.length === 0) return 0;
  return variantes.reduce((sum, v) => sum + (v.stock || 0), 0);
}

export function cantidadParaMovimiento(
  tipo: MovimientoCantidad["tipo"],
  cantidad: number
): number {
  const cant = Math.abs(cantidad || 0);
  if (tipo === "VENTA" || tipo === "SALIDA") {
    return -cant;
  }
  if (tipo === "ENTRADA" || tipo === "AJUSTE") {
    // Para ajuste, típicamente se define signo según contexto; por defecto positivo
    // pero permitir según uso - siguiendo pedido: "cantidad para movimiento (VENTA negativo, ENTRADA positivo)"
    return cant;
  }
  return cant;
}
