/*
 * Reglas del prefijo del museo y del código de las piezas. Funciones puras: la capa de datos las usa
 * dentro de la misma operación que inserta el museo o la pieza.
 */

export const MAXIMO_PREFIJO = 5;
export const MINIMO_DIGITOS_CODIGO = 3;
export const MAXIMO_CODIGO_ANTERIOR = 40;
export const MENSAJE_CODIGO_ANTERIOR_LARGO = `El código anterior no puede tener más de ${MAXIMO_CODIGO_ANTERIOR} caracteres`;
export const MENSAJE_CODIGO_ANTERIOR_REPETIDO = "Ya existe una pieza con ese código anterior en el museo";
export const MENSAJE_MUSEO_NOMBRE_SIN_CARACTERES = "El nombre del museo debe incluir al menos una letra o un número";

/** Palabras que no cuentan en el prefijo (artículos, preposiciones, conjunciones). */
const PALABRAS_IGNORADAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e"]);

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** True si el nombre tiene alguna letra o cifra de la que sacar el prefijo (A a Z o 0 a 9, sin tildes). */
export function nombreTienePrefijo(nombre: string): boolean {
  return /[A-Z0-9]/.test(sinTildes(nombre).toUpperCase());
}

/** Prefijo base sin resolver repetidos: iniciales de las palabras significativas, o tres letras si hay una sola. */
export function prefijoBase(nombre: string): string {
  const palabras = sinTildes(nombre)
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  const significativas = palabras.filter((p) => !PALABRAS_IGNORADAS.has(p.toLowerCase()));
  const usadas = significativas.length > 0 ? significativas : palabras;
  if (usadas.length === 0) return "MUS";
  if (usadas.length === 1) return usadas[0].slice(0, 3);
  return usadas
    .map((p) => p[0])
    .join("")
    .slice(0, MAXIMO_PREFIJO);
}

/** Prefijo del museo: el base, con número al final (2, 3...) hasta no coincidir con ninguno existente. */
export function calcularPrefijoMuseo(nombre: string, existentes: string[]): string {
  const usados = new Set(existentes.map((p) => p.toUpperCase()));
  const base = prefijoBase(nombre);
  if (!usados.has(base)) return base;
  let n = 2;
  while (usados.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/** Código con formato prefijo, guion y número con ceros a la izquierda. */
export function formatearCodigo(prefijo: string, numero: number): string {
  return `${prefijo}-${String(numero).padStart(MINIMO_DIGITOS_CODIGO, "0")}`;
}

/** Orden de códigos: primero el prefijo en orden alfabético y luego el correlativo en orden numérico (MMT-002 antes que MMT-010). */
export function compararCodigos(a: string, b: string): number {
  const separar = (codigo: string): [string, number] | null => {
    const m = /^(.*)-(\d+)$/.exec(codigo);
    return m ? [m[1], Number(m[2])] : null;
  };
  const x = separar(a);
  const y = separar(b);
  if (!x || !y) return a.localeCompare(b, "es");
  return x[0].localeCompare(y[0], "es") || x[1] - y[1];
}

/** Normaliza un código anterior para compararlo: sin espacios repetidos ni diferencias de mayúsculas. */
export function claveCodigoAnterior(valor: string): string {
  return valor.replace(/\s+/g, " ").trim().toLowerCase();
}
