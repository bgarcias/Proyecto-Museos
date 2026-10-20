import { unstable_rethrow } from "next/navigation";
import { MENSAJE_ERROR_INESPERADO } from "../constantes";
import { ErrorDatos } from "../data/errores";

/**
 * Ejecuta una acción de un controlador y convierte sus errores en el resultado de siempre ({ ok: false, error }),
 * que la vista muestra como alerta o como mensaje de campo. Un ErrorDatos ya trae su mensaje en español.
 * Cualquier otro error muestra un mensaje genérico y deja el detalle solo en el registro del servidor.
 * Las redirecciones y los 404 de Next pasan sin tocar.
 */
export async function protegida<T extends { ok: boolean }>(nombre: string, accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ErrorDatos) return { ok: false, error: error.message } as unknown as T;
    console.error(`Error inesperado en ${nombre}:`, error);
    return { ok: false, error: MENSAJE_ERROR_INESPERADO } as unknown as T;
  }
}
