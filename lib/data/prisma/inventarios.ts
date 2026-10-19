import type { Datos } from "../contratos";
import { ErrorDatos, MENSAJES } from "../errores";
import { obtenerPrisma } from "./cliente";
import { bloquearInventario, bloquearPiezas, enTransaccion, exigirMuseos, exigirPiezas, exigirUsuarios, fuera } from "./comun";
import { aCambio, aDetalle, aInventario } from "./conversiones";

const CAMPO_ESTADO = "estado de conservación";
const CAMPO_DISPONIBILIDAD = "disponibilidad";

export const inventarios: Pick<
  Datos,
  | "listarInventarios"
  | "obtenerInventario"
  | "crearInventario"
  | "marcarResultadoInventario"
  | "listarDetalleInventario"
  | "cerrarInventario"
  | "listarHistorialPieza"
  | "registrarCambio"
> = {
  async listarInventarios(organizacionId) {
    const filas = await obtenerPrisma().inventario.findMany({
      where: { museo: { organizacionId } },
      orderBy: [{ fechaInicio: "desc" }, { id: "asc" }],
    });
    return filas.map(aInventario);
  },
  async obtenerInventario(organizacionId, id) {
    const fila = await obtenerPrisma().inventario.findFirst({ where: { id, museo: { organizacionId } } });
    return fila ? aInventario(fila) : null;
  },
  async crearInventario(organizacionId, datos) {
    return enTransaccion(async (tx) => {
      await exigirMuseos(tx, organizacionId, [datos.museoId]);
      await exigirUsuarios(tx, organizacionId, [datos.usuarioId]);
      // El índice único parcial impide dos inventarios en curso en el mismo museo, aunque lleguen a la vez
      const fila = await tx.inventario.create({
        data: { museoId: datos.museoId, usuarioId: datos.usuarioId, fechaInicio: new Date(datos.fechaInicio), estado: "en_curso" },
      });
      return aInventario(fila);
    });
  },
  async marcarResultadoInventario(organizacionId, inventarioId, piezaId, resultado, observacion) {
    return enTransaccion(async (tx) => {
      const inventario = await tx.inventario.findFirst({ where: { id: inventarioId, museo: { organizacionId } } });
      if (!inventario) fuera("El inventario");
      await exigirPiezas(tx, organizacionId, [piezaId]);
      // Con el inventario bloqueado, un cierre simultáneo espera y esta marca ve el estado ya cerrado
      await bloquearInventario(tx, inventarioId);
      const actual = await tx.inventario.findUnique({ where: { id: inventarioId } });
      if (!actual || actual.estado !== "en_curso") throw new ErrorDatos(MENSAJES.inventarioCerrado);
      const fila = await tx.detalleInventario.upsert({
        where: { inventarioId_piezaId: { inventarioId, piezaId } },
        create: { inventarioId, piezaId, resultado, observacion: observacion ?? null },
        update: { resultado, observacion: observacion ?? null },
      });
      return aDetalle(fila);
    });
  },
  async listarDetalleInventario(organizacionId, inventarioId) {
    const filas = await obtenerPrisma().detalleInventario.findMany({
      where: { inventarioId, inventario: { museo: { organizacionId } } },
      orderBy: { id: "asc" },
    });
    return filas.map(aDetalle);
  },
  /**
   * Cierra el inventario solo si sigue en curso y aplica, en la misma transacción, los efectos del cierre que
   * falten: lo no encontrado pasa a pendiente de verificación, lo encontrado que estaba pendiente vuelve a disponible
   * y lo marcado con daño pasa a estado malo, cada cambio con su registro de historial. Cada efecto parte del valor
   * leído dentro de la transacción, así que no repite uno que ya se aplicó.
   */
  async cerrarInventario(organizacionId, id, fechaCierre, usuarioCierreId) {
    await enTransaccion(async (tx) => {
      const inventario = await tx.inventario.findFirst({ where: { id, museo: { organizacionId } } });
      if (!inventario) return;
      await exigirUsuarios(tx, organizacionId, [usuarioCierreId]);

      const cerrado = await tx.inventario.updateMany({
        where: { id, estado: "en_curso" },
        data: { estado: "cerrado", fechaCierre: new Date(fechaCierre), usuarioCierreId },
      });
      if (cerrado.count === 0) throw new ErrorDatos(MENSAJES.inventarioCerrado);

      const detalles = await tx.detalleInventario.findMany({ where: { inventarioId: id } });
      await bloquearPiezas(tx, detalles.map((d) => d.piezaId));
      for (const d of detalles) {
        const pieza = await tx.pieza.findUnique({ where: { id: d.piezaId } });
        if (!pieza) continue;
        const cambio = async (campo: string, anterior: string, nuevo: string) => {
          await tx.historialCambio.create({
            data: { piezaId: pieza.id, usuarioId: usuarioCierreId, campoModificado: campo, valorAnterior: anterior, valorNuevo: nuevo },
          });
        };
        if (d.resultado === "no_encontrada") {
          if (pieza.disponibilidad !== "pendiente_verificacion") {
            await tx.pieza.update({ where: { id: pieza.id }, data: { disponibilidad: "pendiente_verificacion" } });
            await cambio(CAMPO_DISPONIBILIDAD, pieza.disponibilidad, "pendiente_verificacion");
          }
          continue;
        }
        if (pieza.disponibilidad === "pendiente_verificacion") {
          await tx.pieza.update({ where: { id: pieza.id }, data: { disponibilidad: "disponible" } });
          await cambio(CAMPO_DISPONIBILIDAD, "pendiente_verificacion", "disponible");
        }
        if (d.resultado === "con_dano" && pieza.estadoConservacion !== "malo") {
          await tx.pieza.update({ where: { id: pieza.id }, data: { estadoConservacion: "malo" } });
          await cambio(CAMPO_ESTADO, pieza.estadoConservacion, "malo");
        }
      }
    });
  },

  async listarHistorialPieza(organizacionId, piezaId) {
    const filas = await obtenerPrisma().historialCambio.findMany({
      where: { piezaId, pieza: { museo: { organizacionId } } },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
    });
    return filas.map(aCambio);
  },
  async registrarCambio(organizacionId, datos) {
    return enTransaccion(async (tx) => {
      await exigirPiezas(tx, organizacionId, [datos.piezaId]);
      await exigirUsuarios(tx, organizacionId, [datos.usuarioId]);
      const fila = await tx.historialCambio.create({
        data: {
          piezaId: datos.piezaId,
          usuarioId: datos.usuarioId,
          campoModificado: datos.campoModificado,
          valorAnterior: datos.valorAnterior ?? null,
          valorNuevo: datos.valorNuevo ?? null,
        },
      });
      return aCambio(fila);
    });
  },
};
