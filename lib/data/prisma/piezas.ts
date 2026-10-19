import { randomUUID } from "node:crypto";
import { claveCodigoAnterior, formatearCodigo } from "../../codigos";
import type { Datos, NuevaPieza } from "../contratos";
import type { Pieza } from "../../tipos";
import { obtenerPrisma } from "./cliente";
import { enTransaccion, exigirCategorias, exigirMuseos } from "./comun";
import { aPieza } from "./conversiones";
import type { Prisma } from "./generado/client";

/** Inserta el lote asignando los códigos en orden, todo dentro de una transacción. */
async function crearLote(organizacionId: string, lote: NuevaPieza[]): Promise<Pieza[]> {
  if (lote.length === 0) return [];
  return enTransaccion(async (tx) => {
    const museoIds = [...new Set(lote.map((d) => d.museoId))].sort();
    await exigirMuseos(tx, organizacionId, museoIds);
    await exigirCategorias(tx, organizacionId, lote.map((d) => d.categoriaId));
    const museos = await tx.museo.findMany({ where: { id: { in: museoIds } } });

    // Cada museo reserva sus números con un solo incremento atómico: la fila queda bloqueada hasta el final,
    // así dos cargas simultáneas no repiten códigos. Los museos se recorren en orden de id para no cruzar bloqueos.
    const siguiente = new Map<string, number>();
    for (const museoId of museoIds) {
      const cantidad = lote.filter((d) => d.museoId === museoId).length;
      const museo = await tx.museo.update({
        where: { id: museoId },
        data: { ultimoCorrelativo: { increment: cantidad } },
        select: { ultimoCorrelativo: true },
      });
      siguiente.set(museoId, museo.ultimoCorrelativo - cantidad + 1);
    }

    // Los códigos se asignan en el orden recibido
    const filas = lote.map((d) => {
      const numero = siguiente.get(d.museoId) as number;
      siguiente.set(d.museoId, numero + 1);
      const prefijo = museos.find((m) => m.id === d.museoId)?.prefijo ?? "";
      return {
        id: randomUUID(),
        museoId: d.museoId,
        categoriaId: d.categoriaId,
        codigo: formatearCodigo(prefijo, numero),
        codigoAnterior: d.codigoAnterior ?? null,
        nombre: d.nombre,
        descripcion: d.descripcion ?? null,
        anio: d.anio ?? null,
        material: d.material ?? null,
        estadoConservacion: d.estadoConservacion,
        ubicacionFisica: d.ubicacionFisica ?? null,
        imagenUrl: d.imagenUrl ?? null,
        disponibilidad: "disponible",
      };
    });
    const creadas = await tx.pieza.createManyAndReturn({ data: filas });
    const porId = new Map(creadas.map((c) => [c.id, c]));
    return filas.map((f) => aPieza(porId.get(f.id) as (typeof creadas)[number]));
  });
}

export const piezas: Pick<
  Datos,
  | "listarPiezas"
  | "obtenerPieza"
  | "buscarPiezaPorCodigoAnterior"
  | "crearPieza"
  | "crearPiezas"
  | "actualizarPieza"
  | "actualizarEstadoPieza"
  | "actualizarDisponibilidadPieza"
> = {
  async listarPiezas(organizacionId) {
    const filas = await obtenerPrisma().pieza.findMany({
      where: { museo: { organizacionId } },
      orderBy: [{ museoId: "asc" }, { codigo: "asc" }],
    });
    return filas.map(aPieza);
  },
  async obtenerPieza(organizacionId, id) {
    const fila = await obtenerPrisma().pieza.findFirst({ where: { id, museo: { organizacionId } } });
    return fila ? aPieza(fila) : null;
  },
  async buscarPiezaPorCodigoAnterior(organizacionId, museoId, codigoAnterior) {
    const prisma = obtenerPrisma();
    // La misma normalización del índice único: espacios repetidos a uno, sin espacios al borde y en minúscula.
    // En una plantilla de JavaScript la barra invertida hay que escribirla doble: con una sola, \s llega como s.
    const filas = await prisma.$queryRaw<{ id: string }[]>`
      select p.id from pieza p join museo m on m.id = p.museo_id
      where p.museo_id = ${museoId}::uuid and m.organizacion_id = ${organizacionId}::uuid and p.codigo_anterior is not null
        and lower(btrim(regexp_replace(p.codigo_anterior, '\\s+', ' ', 'g'))) = ${claveCodigoAnterior(codigoAnterior)}
      limit 1`;
    if (filas.length === 0) return null;
    const fila = await prisma.pieza.findUnique({ where: { id: filas[0].id } });
    return fila ? aPieza(fila) : null;
  },
  async crearPieza(organizacionId, datos) {
    const [creada] = await crearLote(organizacionId, [datos]);
    return creada;
  },
  crearPiezas: crearLote,
  async actualizarPieza(organizacionId, id, cambios) {
    const data: Prisma.PiezaUncheckedUpdateManyInput = {};
    if (cambios.nombre !== undefined) data.nombre = cambios.nombre;
    if (cambios.categoriaId !== undefined) data.categoriaId = cambios.categoriaId;
    // Una clave presente con valor vacío borra el dato, como en la memoria
    if ("codigoAnterior" in cambios) data.codigoAnterior = cambios.codigoAnterior ?? null;
    if ("descripcion" in cambios) data.descripcion = cambios.descripcion ?? null;
    if ("anio" in cambios) data.anio = cambios.anio ?? null;
    if ("material" in cambios) data.material = cambios.material ?? null;
    if ("ubicacionFisica" in cambios) data.ubicacionFisica = cambios.ubicacionFisica ?? null;
    if ("imagenUrl" in cambios) data.imagenUrl = cambios.imagenUrl ?? null;
    await enTransaccion(async (tx) => {
      if (cambios.categoriaId) await exigirCategorias(tx, organizacionId, [cambios.categoriaId]);
      await tx.pieza.updateMany({ where: { id, museo: { organizacionId } }, data });
    });
  },
  async actualizarEstadoPieza(organizacionId, id, estado) {
    await obtenerPrisma().pieza.updateMany({ where: { id, museo: { organizacionId } }, data: { estadoConservacion: estado } });
  },
  async actualizarDisponibilidadPieza(organizacionId, id, disponibilidad) {
    await obtenerPrisma().pieza.updateMany({ where: { id, museo: { organizacionId } }, data: { disponibilidad } });
  },
};
