import { obtenerDataSource } from "../config/env";
import type { Datos } from "./contratos";

/** Implementación según DATA_SOURCE; memoria por defecto. Cuando exista lib/data/prisma se agrega aquí. */
export async function obtenerDatos(): Promise<Datos> {
  if (obtenerDataSource() === "prisma") {
    throw new Error(
      "DATA_SOURCE=prisma aún no está implementado. Implementa lib/data/prisma cumpliendo lib/data/contratos.ts o usa DATA_SOURCE=memoria (ver docs/CONEXION.md).",
    );
  }
  const { datosMemoria } = await import("./memoria");
  return datosMemoria;
}
