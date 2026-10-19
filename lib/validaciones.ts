/*
 * Validaciones de formulario que comparten las vistas y los controladores.
 * Las vistas las usan para avisar de inmediato. Los controladores las repiten siempre,
 * porque no se puede confiar en lo que envía el cliente.
 */

import { hoyISO } from "./fechas";

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function esCorreoValido(correo: string): boolean {
  return FORMATO_CORREO.test(correo.trim());
}

/** Error de un campo de correo: vacío o con formato inválido. Devuelve undefined si es válido. */
export function errorDeCorreo(correo: string): string | undefined {
  if (!correo.trim()) return "Ingresa tu correo electrónico";
  if (!esCorreoValido(correo)) return "Ingresa un correo electrónico válido";
  return undefined;
}

/** Al iniciar sesión solo se valida que la contraseña no esté vacía, sin reglas de complejidad. */
export function errorDeContrasenaIngreso(contrasena: string): string | undefined {
  return contrasena.length === 0 ? "Ingresa tu contraseña" : undefined;
}

/* Año de una pieza: una sola definición para el registro, la edición y la importación. */

export const ANIO_MINIMO = -10000;
export const MENSAJE_ANIO_ENTERO = "El año debe ser un número entero";
export const MENSAJE_ANIO_RANGO = "El año debe estar entre -10000 y el año actual";

/** Año actual en la zona horaria del sistema (America/Lima). Los controladores lo calculan en el servidor. */
export function anioActual(): number {
  return Number(hoyISO().slice(0, 4));
}

/** True si es un entero entre el mínimo y el año actual. */
export function anioEnRango(anio: number): boolean {
  return Number.isInteger(anio) && anio >= ANIO_MINIMO && anio <= anioActual();
}

/**
 * Validación estricta del año. Se recorta el texto y vacío significa sin año. Solo se acepta un signo menos
 * opcional seguido de dígitos: no hay decimales, notación científica, hexadecimales ni signo más.
 */
export function validarAnio(texto: string): { ok: true; anio?: number } | { ok: false; error: string } {
  const limpio = texto.trim();
  if (limpio === "") return { ok: true };
  if (!/^-?\d+$/.test(limpio)) return { ok: false, error: MENSAJE_ANIO_ENTERO };
  const numero = Number(limpio);
  if (!anioEnRango(numero)) return { ok: false, error: MENSAJE_ANIO_RANGO };
  return { ok: true, anio: numero === 0 ? 0 : numero };
}

/* Valor asegurado de un préstamo: una sola definición para la vista y el controlador. */

export const VALOR_ASEGURADO_MINIMO = 0.01;
export const VALOR_ASEGURADO_MAXIMO = 100_000_000;
export const MENSAJE_VALOR_ASEGURADO = "El valor asegurado debe ser un número mayor que cero, con hasta 2 decimales, y no superar 100 millones";

/**
 * Validación estricta del valor asegurado. Se recorta el texto y solo se acepta un número con dígitos y hasta 2 decimales
 * con punto: sin signo, notación científica, hexadecimal ni separadores de miles. Debe ser mayor que cero y no superar el máximo.
 */
export function validarValorAsegurado(texto: string): { ok: true; valor: number } | { ok: false; error: string } {
  const limpio = texto.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return { ok: false, error: MENSAJE_VALOR_ASEGURADO };
  const valor = Number(limpio);
  if (!(valor > 0) || valor > VALOR_ASEGURADO_MAXIMO) return { ok: false, error: MENSAJE_VALOR_ASEGURADO };
  return { ok: true, valor };
}

/* Reglas de la contraseña nueva: una sola definición para la generación, el cambio, la recuperación y la semilla. */

export const CONTRASENA_MINIMO = 10;
export const CONTRASENA_MAXIMO = 15;
export const MENSAJE_CONTRASENA_MINIMO = `La contraseña debe tener al menos ${CONTRASENA_MINIMO} caracteres`;
export const MENSAJE_CONTRASENA_MAXIMO = `La contraseña no puede tener más de ${CONTRASENA_MAXIMO} caracteres`;

/** Error de longitud de una contraseña nueva. Devuelve undefined si cumple el mínimo y el máximo. */
export function errorDeLongitudContrasena(contrasena: string): string | undefined {
  if (contrasena.length < CONTRASENA_MINIMO) return MENSAJE_CONTRASENA_MINIMO;
  if (contrasena.length > CONTRASENA_MAXIMO) return MENSAJE_CONTRASENA_MAXIMO;
  return undefined;
}
