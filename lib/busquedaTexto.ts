// Búsqueda de texto de los buscadores: sin distinguir mayúsculas ni tildes.

/** Minúsculas y sin tildes, para comparar textos sin distinguir mayúsculas ni acentos. */
function paraComparar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Coincidencia parcial que ignora mayúsculas y tildes. Un texto buscado vacío coincide con todo. */
export function coincideTexto(valor: string | undefined, buscado: string | undefined): boolean {
  if (!buscado?.trim()) return true;
  return paraComparar(valor ?? "").includes(paraComparar(buscado.trim()));
}
