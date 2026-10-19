import type { FiltrosReporte } from "./tipos";

/*
 * Los filtros de un reporte viajan a las rutas de exportación como parámetros de la dirección.
 * Lo comparten la vista (enlaces de descarga) y las rutas (que los leen).
 */

/** Parámetros de dirección de los filtros. Los vacíos no se envían. */
export function filtrosAParametros(filtros: FiltrosReporte): string {
  const parametros = new URLSearchParams();
  if (filtros.categoriaId) parametros.set("categoriaId", filtros.categoriaId);
  if (filtros.estado) parametros.set("estado", filtros.estado);
  if (filtros.desde) parametros.set("desde", filtros.desde);
  if (filtros.hasta) parametros.set("hasta", filtros.hasta);
  return parametros.toString();
}

/** Filtros a partir de los parámetros de dirección. Los ausentes quedan sin valor. */
export function parametrosAFiltros(parametros: URLSearchParams): FiltrosReporte {
  return {
    categoriaId: parametros.get("categoriaId") || undefined,
    estado: parametros.get("estado") || undefined,
    desde: parametros.get("desde") || undefined,
    hasta: parametros.get("hasta") || undefined,
  };
}

/** Versión genérica para los demás reportes: arma los parámetros de dirección de un conjunto de filtros de texto. */
export function mapaAParametros(valores: Record<string, string | undefined>): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(valores)) if (valor) parametros.set(clave, valor);
  return parametros.toString();
}

/** Lee los parámetros indicados. Los ausentes o vacíos quedan sin valor. */
export function parametrosAMapa<K extends string>(parametros: URLSearchParams, claves: readonly K[]): Partial<Record<K, string>> {
  const resultado: Partial<Record<K, string>> = {};
  for (const clave of claves) resultado[clave] = parametros.get(clave) || undefined;
  return resultado;
}
