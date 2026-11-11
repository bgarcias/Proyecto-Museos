import { ESTADOS_CONSERVACION, textoReclamoPoliza } from "./constantes";
import type { EstadoConservacion } from "./tipos";

export type DatosDeterioro = {
  estadoConservacionSalida: EstadoConservacion;
  /** Estado al regresar. Vacío o ausente mientras el préstamo no se devuelve o la persona no ha elegido. */
  estadoConservacionDevolucion?: string;
  numeroPoliza: string;
  valorAsegurado: number;
};

/**
 * Regla única de devolución con deterioro: el estado al regresar es peor que el de salida (orden: bueno, regular, malo).
 * Se calcula con datos ya guardados. Devuelve el texto del reclamo a la póliza, o nada si no hay deterioro.
 */
export function textoDeterioro(datos: DatosDeterioro): string | undefined {
  const salida = ESTADOS_CONSERVACION.indexOf(datos.estadoConservacionSalida);
  const devolucion = ESTADOS_CONSERVACION.indexOf(datos.estadoConservacionDevolucion as EstadoConservacion);
  if (salida < 0 || devolucion < 0 || devolucion <= salida) return undefined;
  return textoReclamoPoliza(
    datos.estadoConservacionSalida,
    datos.estadoConservacionDevolucion as EstadoConservacion,
    datos.numeroPoliza,
    datos.valorAsegurado,
  );
}

/** Estados que se pueden elegir al regresar: el de salida o uno peor, con el mismo orden de la regla de deterioro. */
export function estadosDevolucionPermitidos(salida: EstadoConservacion): EstadoConservacion[] {
  return ESTADOS_CONSERVACION.slice(ESTADOS_CONSERVACION.indexOf(salida));
}

/** True si el préstamo devuelto regresó con deterioro. */
export function devueltoConDeterioro(datos: DatosDeterioro): boolean {
  return textoDeterioro(datos) !== undefined;
}
