import type { Datos } from "../contratos";
import { ErrorDatos, traducir } from "../errores";
import { catalogo } from "./catalogo";
import { exposiciones } from "./exposiciones";
import { inventarios } from "./inventarios";
import { piezas } from "./piezas";
import { prestamos } from "./prestamos";
import { usuarios } from "./usuarios";

/** Envuelve cada función para que los errores de la base salgan como ErrorDatos con mensaje en español. */
function conTraduccion<T extends object>(grupo: T): T {
  const envuelto: Record<string, unknown> = {};
  for (const [nombre, funcion] of Object.entries(grupo)) {
    envuelto[nombre] = (...args: unknown[]) => traducir(() => (funcion as (...a: unknown[]) => Promise<unknown>)(...args));
  }
  return envuelto as T;
}

/** Implementación del contrato con Prisma y la base real. */
export const datosPrisma: Datos = {
  ...conTraduccion(catalogo),
  ...conTraduccion(usuarios),
  ...conTraduccion(piezas),
  ...conTraduccion(exposiciones),
  ...conTraduccion(prestamos),
  ...conTraduccion(inventarios),
  async restablecerDatos() {
    throw new ErrorDatos("restablecerDatos no existe con la base real");
  },
};
