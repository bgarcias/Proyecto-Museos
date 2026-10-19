/*
 * Límites del archivo de importación de piezas. Viven aparte de lib/importacion/importacion.ts, que depende de exceljs,
 * para que las vistas puedan usarlos sin llevar esa librería al navegador.
 */

export const MAXIMO_BYTES_ARCHIVO = 5 * 1024 * 1024;
export const MAXIMO_MEGABYTES_ARCHIVO = MAXIMO_BYTES_ARCHIVO / (1024 * 1024);
export const MAXIMO_FILAS = 500;
