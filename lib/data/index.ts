import { obtenerDataSource } from "../config/env";
import type { Datos } from "./contratos";

/** Implementación según DATA_SOURCE: memoria por defecto, o la base real con prisma. */
export async function obtenerDatos(): Promise<Datos> {
  if (obtenerDataSource() === "prisma") {
    const { datosPrisma } = await import("./prisma");
    return datosPrisma;
  }
  const { datosMemoria } = await import("./memoria");
  return datosMemoria;
}
