import type { Datos } from "./contratos";

/** Implementación con Prisma sobre la base real. */
export async function obtenerDatos(): Promise<Datos> {
  const { datosPrisma } = await import("./prisma");
  return datosPrisma;
}
