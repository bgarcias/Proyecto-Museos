import { rangoExposicion, rangosSeCruzan } from "../../fechas";
import type { Datos } from "../contratos";
import { ErrorDatos, MENSAJES } from "../errores";
import { obtenerPrisma } from "./cliente";
import { aColumnaDia, bloquearPiezas, enTransaccion, exigirMuseos, exigirPiezas, type Tx } from "./comun";
import { aDia, aExposicion } from "./conversiones";
import type { Prisma } from "./generado/client";

const CON_PIEZAS = { piezas: { select: { piezaId: true } } } as const;

/**
 * Valida dentro de la transacción, con las piezas ya bloqueadas, que ninguna tenga un préstamo abierto ni otra
 * exposición activa con fechas que se crucen. Ignora la exposición que se está modificando.
 */
async function validarCruces(
  tx: Tx,
  piezaIds: string[],
  rango: { inicio: string; fin: string },
  excluirId?: string,
): Promise<void> {
  if (piezaIds.length === 0) return;
  const prestamos = await tx.prestamo.findMany({ where: { piezaId: { in: piezaIds }, fechaDevolucionReal: null } });
  const cruzaPrestamo = prestamos.some((p) =>
    rangosSeCruzan({ inicio: aDia(p.fechaSalida), fin: aDia(p.fechaDevolucionPrevista) }, rango),
  );
  if (cruzaPrestamo) throw new ErrorDatos(MENSAJES.exposicionConflicto);

  const otras = await tx.exposicion.findMany({
    where: {
      cancelada: false,
      ...(excluirId ? { id: { not: excluirId } } : {}),
      piezas: { some: { piezaId: { in: piezaIds } } },
    },
    include: CON_PIEZAS,
  });
  const cruzaOtra = otras.some(
    (e) =>
      e.piezas.some((p) => piezaIds.includes(p.piezaId)) &&
      rangosSeCruzan(rangoExposicion({ fechaInicio: aDia(e.fechaInicio), fechaFin: aDia(e.fechaFin) }), rango),
  );
  if (cruzaOtra) throw new ErrorDatos(MENSAJES.exposicionConflicto);
}

export const exposiciones: Pick<
  Datos,
  "listarExposiciones" | "obtenerExposicion" | "crearExposicion" | "actualizarExposicion" | "cancelarExposicion"
> = {
  async listarExposiciones(organizacionId) {
    const filas = await obtenerPrisma().exposicion.findMany({
      where: { museo: { organizacionId } },
      include: CON_PIEZAS,
      orderBy: [{ fechaInicio: "desc" }, { id: "asc" }],
    });
    return filas.map(aExposicion);
  },
  async obtenerExposicion(organizacionId, id) {
    const fila = await obtenerPrisma().exposicion.findFirst({ where: { id, museo: { organizacionId } }, include: CON_PIEZAS });
    return fila ? aExposicion(fila) : null;
  },
  async crearExposicion(organizacionId, datos) {
    const piezaIds = [...new Set(datos.piezaIds)];
    return enTransaccion(async (tx) => {
      await exigirMuseos(tx, organizacionId, [datos.museoId]);
      await exigirPiezas(tx, organizacionId, piezaIds);
      await bloquearPiezas(tx, piezaIds);
      await validarCruces(tx, piezaIds, { inicio: datos.fechaInicio, fin: datos.fechaFin });
      const fila = await tx.exposicion.create({
        data: {
          museoId: datos.museoId,
          nombre: datos.nombre,
          descripcion: datos.descripcion ?? null,
          fechaInicio: aColumnaDia(datos.fechaInicio),
          fechaFin: aColumnaDia(datos.fechaFin),
          piezas: { create: piezaIds.map((piezaId) => ({ piezaId })) },
        },
        include: CON_PIEZAS,
      });
      return aExposicion(fila);
    });
  },
  async actualizarExposicion(organizacionId, id, cambios) {
    await enTransaccion(async (tx) => {
      const actual = await tx.exposicion.findFirst({ where: { id, museo: { organizacionId } }, include: CON_PIEZAS });
      // Si no existe, es de otra organización o ya está cancelada, no cambia nada
      if (!actual || actual.cancelada) return;
      if (cambios.museoId) await exigirMuseos(tx, organizacionId, [cambios.museoId]);
      const piezaIds = [...new Set(cambios.piezaIds ?? actual.piezas.map((p) => p.piezaId))];
      if (cambios.piezaIds) await exigirPiezas(tx, organizacionId, piezaIds);

      await bloquearPiezas(tx, piezaIds);
      const inicio = cambios.fechaInicio ?? aDia(actual.fechaInicio);
      const fin = cambios.fechaFin ?? aDia(actual.fechaFin);
      await validarCruces(tx, piezaIds, { inicio, fin }, id);

      const data: Prisma.ExposicionUncheckedUpdateManyInput = {};
      if (cambios.museoId !== undefined) data.museoId = cambios.museoId;
      if (cambios.nombre !== undefined) data.nombre = cambios.nombre;
      if ("descripcion" in cambios) data.descripcion = cambios.descripcion ?? null;
      if (cambios.fechaInicio !== undefined) data.fechaInicio = aColumnaDia(cambios.fechaInicio);
      if (cambios.fechaFin !== undefined) data.fechaFin = aColumnaDia(cambios.fechaFin);
      const filas = await tx.exposicion.updateMany({ where: { id, cancelada: false }, data });
      if (filas.count === 0) return;
      if (cambios.piezaIds) {
        await tx.piezaExposicion.deleteMany({ where: { exposicionId: id } });
        await tx.piezaExposicion.createMany({ data: piezaIds.map((piezaId) => ({ exposicionId: id, piezaId })) });
      }
    });
  },
  async cancelarExposicion(organizacionId, id) {
    // Condicionada: solo cancela si sigue activa
    await obtenerPrisma().exposicion.updateMany({
      where: { id, cancelada: false, museo: { organizacionId } },
      data: { cancelada: true },
    });
  },
};
