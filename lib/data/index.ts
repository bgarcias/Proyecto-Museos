import { obtenerDataSource } from "../config/env";
import type { Datos } from "./contratos";

/**
 * Elige la implementación de la capa de datos según DATA_SOURCE.
 * Por defecto es memoria. Cuando exista lib/data/prisma, se agrega aquí.
 */
export async function obtenerDatos(): Promise<Datos> {
  if (obtenerDataSource() === "prisma") {
    throw new Error(
      "DATA_SOURCE=prisma aún no está implementado. Implementa lib/data/prisma cumpliendo lib/data/contratos.ts o usa DATA_SOURCE=memoria (ver docs/CONEXION.md).",
    );
  }
  const { datosMemoria } = await import("./memoria");
  return datosMemoria;
}
