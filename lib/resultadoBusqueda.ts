/**
 * Línea de resultado de los buscadores: "N piezas" sin filtros aplicados, o "X de N piezas" con filtros.
 * N es el total visible para la persona. Con N igual a 1 se usa el singular.
 */
export function textoResultadoBusqueda(
  mostradas: number,
  total: number,
  conFiltros: boolean,
  singular: string,
  plural: string,
): string {
  const unidad = total === 1 ? singular : plural;
  return conFiltros ? `${mostradas} de ${total} ${unidad}` : `${total} ${unidad}`;
}
