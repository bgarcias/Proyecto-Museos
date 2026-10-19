/*
 * Límites del archivo de importación. Separados de importacion.ts (que usa exceljs)
 * para que las vistas los usen sin llevar esa librería al navegador.
 */

export const MAXIMO_BYTES_ARCHIVO = 4 * 1024 * 1024;
export const MAXIMO_MEGABYTES_ARCHIVO = MAXIMO_BYTES_ARCHIVO / (1024 * 1024);
export const MAXIMO_FILAS = 500;
