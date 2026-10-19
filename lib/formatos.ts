/** Monto con separador de miles y 2 decimales, por ejemplo 12,000.00. */
export function formatearMonto(valor: number): string {
  return valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
