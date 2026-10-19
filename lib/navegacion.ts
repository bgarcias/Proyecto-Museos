/*
 * Única fuente de las opciones de navegación. El menú y las tarjetas de acceso del inicio salen de esta lista,
 * con el mismo orden y los mismos permisos por rol, para que no puedan desfasarse.
 */

import {
  DETALLE_REPORTES_INICIO,
  DETALLE_REPORTE_EXPOSICIONES,
  DETALLE_REPORTE_PIEZAS,
  DETALLE_REPORTE_PRESTAMOS,
  TITULO_REPORTE,
  TITULO_REPORTE_EXPOSICIONES,
  TITULO_REPORTE_PIEZAS,
  TITULO_REPORTE_PRESTAMOS,
  TITULO_RESULTADOS_REPORTE,
} from "./constantes";

export type OpcionNavegacion = {
  href: string;
  texto: string;
  /** Detalle corto que se muestra en la tarjeta de acceso del inicio. */
  detalle: string;
  /** Solo la ve el administrador. */
  soloAdministrador?: boolean;
};

export const OPCIONES_NAVEGACION: readonly OpcionNavegacion[] = [
  { href: "/piezas", texto: "Piezas", detalle: "Catálogo, estado de conservación e historial" },
  { href: "/exposiciones", texto: "Exposiciones", detalle: "Registrar, modificar y cancelar exposiciones" },
  { href: "/prestamos", texto: "Préstamos", detalle: "Registrar préstamos y devoluciones de piezas" },
  { href: "/inventarios", texto: "Inventarios", detalle: "Conteo físico de piezas por museo" },
  { href: "/reportes", texto: "Reportes", detalle: DETALLE_REPORTES_INICIO },
  { href: "/usuarios", texto: "Usuarios", detalle: "Cuentas del museo y museos asignados", soloAdministrador: true },
  { href: "/museos", texto: "Museos", detalle: "Altas, ediciones y estado de los museos", soloAdministrador: true },
];

/** Un reporte del menú de reportes. Para conectar uno futuro basta completar su ruta y marcarlo como disponible. */
export type ReporteDisponible = {
  id: string;
  titulo: string;
  detalle: string;
  ruta: string;
  disponible: boolean;
};

/** Única fuente de los reportes del menú de reportes, en el orden en que se muestran. */
export const REPORTES: readonly ReporteDisponible[] = [
  { id: "categoria-estado", titulo: TITULO_REPORTE, detalle: TITULO_RESULTADOS_REPORTE, ruta: "/reportes/categoria-estado", disponible: true },
  { id: "piezas", titulo: TITULO_REPORTE_PIEZAS, detalle: DETALLE_REPORTE_PIEZAS, ruta: "/reportes/piezas", disponible: true },
  { id: "exposiciones", titulo: TITULO_REPORTE_EXPOSICIONES, detalle: DETALLE_REPORTE_EXPOSICIONES, ruta: "/reportes/exposiciones", disponible: true },
  { id: "prestamos", titulo: TITULO_REPORTE_PRESTAMOS, detalle: DETALLE_REPORTE_PRESTAMOS, ruta: "/reportes/prestamos", disponible: true },
];

/** Opciones que corresponden al rol, en el orden del menú. */
export function opcionesDeNavegacion(esAdministrador: boolean): OpcionNavegacion[] {
  return OPCIONES_NAVEGACION.filter((o) => esAdministrador || !o.soloAdministrador);
}
