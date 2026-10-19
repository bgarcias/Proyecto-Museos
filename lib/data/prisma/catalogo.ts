import { calcularPrefijoMuseo } from "../../codigos";
import type { Datos } from "../contratos";
import { esRestriccion } from "../errores";
import { obtenerPrisma } from "./cliente";
import { aCategoria, aMuseo, aOrganizacion } from "./conversiones";
import type { Prisma } from "./generado/client";

const INTENTOS_PREFIJO = 5;

/** Museos y categorías ordenados por nombre. "Otro" va al final en las categorías, como la categoría general. */
const porNombre = (a: { nombre: string }, b: { nombre: string }) => a.nombre.localeCompare(b.nombre, "es");
const otroAlFinal = (a: { nombre: string }, b: { nombre: string }) =>
  Number(a.nombre === "Otro") - Number(b.nombre === "Otro") || porNombre(a, b);

export const catalogo: Pick<
  Datos,
  | "obtenerOrganizacion"
  | "listarMuseos"
  | "obtenerMuseo"
  | "crearMuseo"
  | "actualizarMuseo"
  | "cambiarActivoMuseo"
  | "listarCategorias"
> = {
  async obtenerOrganizacion(organizacionId) {
    const fila = await obtenerPrisma().organizacion.findUnique({ where: { id: organizacionId } });
    return fila ? aOrganizacion(fila) : null;
  },

  async listarMuseos(organizacionId) {
    const filas = await obtenerPrisma().museo.findMany({ where: { organizacionId } });
    return filas.map(aMuseo).sort(porNombre);
  },
  async obtenerMuseo(organizacionId, id) {
    const fila = await obtenerPrisma().museo.findFirst({ where: { id, organizacionId } });
    return fila ? aMuseo(fila) : null;
  },
  async crearMuseo(organizacionId, datos) {
    const prisma = obtenerPrisma();
    // El prefijo se calcula con los existentes. Si otra persona creó uno igual al mismo tiempo, se recalcula.
    for (let intento = 1; ; intento++) {
      const existentes = await prisma.museo.findMany({ where: { organizacionId }, select: { prefijo: true } });
      const prefijo = calcularPrefijoMuseo(datos.nombre, existentes.map((m) => m.prefijo));
      try {
        const fila = await prisma.museo.create({
          data: { organizacionId, nombre: datos.nombre, prefijo, tipo: datos.tipo, direccion: datos.direccion ?? null, activo: true },
        });
        return aMuseo(fila);
      } catch (error) {
        if (esRestriccion(error, "museo_organizacion_prefijo_unico") && intento < INTENTOS_PREFIJO) continue;
        throw error;
      }
    }
  },
  async actualizarMuseo(organizacionId, id, cambios) {
    const data: Prisma.MuseoUpdateManyMutationInput = {};
    if (cambios.nombre !== undefined) data.nombre = cambios.nombre;
    if (cambios.tipo !== undefined) data.tipo = cambios.tipo;
    // Una clave presente con valor vacío borra la dirección, como en la memoria
    if ("direccion" in cambios) data.direccion = cambios.direccion ?? null;
    await obtenerPrisma().museo.updateMany({ where: { id, organizacionId }, data });
  },
  async cambiarActivoMuseo(organizacionId, id, activo) {
    await obtenerPrisma().museo.updateMany({ where: { id, organizacionId }, data: { activo } });
  },

  async listarCategorias(organizacionId) {
    const filas = await obtenerPrisma().categoria.findMany({ where: { organizacionId } });
    return filas.map(aCategoria).sort(otroAlFinal);
  },
};
