import { rangoExposicion, rangosSeCruzan } from "../../fechas";
import type { Datos } from "../contratos";
import { ErrorDatos, MENSAJES } from "../errores";
import { obtenerPrisma } from "./cliente";
import { aColumnaDia, bloquearPiezas, enTransaccion, exigirUsuarios, fuera } from "./comun";
import { aDia, aPrestamo } from "./conversiones";

export const prestamos: Pick<Datos, "listarPrestamos" | "obtenerPrestamo" | "crearPrestamo" | "registrarDevolucion"> = {
  async listarPrestamos(organizacionId) {
    const filas = await obtenerPrisma().prestamo.findMany({
      where: { pieza: { museo: { organizacionId } } },
      orderBy: [{ fechaSalida: "desc" }, { id: "asc" }],
    });
    return filas.map(aPrestamo);
  },
  async obtenerPrestamo(organizacionId, id) {
    const fila = await obtenerPrisma().prestamo.findFirst({ where: { id, pieza: { museo: { organizacionId } } } });
    return fila ? aPrestamo(fila) : null;
  },
  async crearPrestamo(organizacionId, datos) {
    return enTransaccion(async (tx) => {
      const pieza = await tx.pieza.findFirst({ where: { id: datos.piezaId, museo: { organizacionId } } });
      if (!pieza) fuera("La pieza");
      await exigirUsuarios(tx, organizacionId, [datos.usuarioId]);

      // Con la pieza bloqueada, otra persona que la preste o la asigne al mismo tiempo espera aquí y la ve ocupada
      await bloquearPiezas(tx, [pieza.id]);
      const actual = await tx.pieza.findUnique({ where: { id: pieza.id } });
      if (!actual || actual.disponibilidad !== "disponible") throw new ErrorDatos(MENSAJES.prestamoNoDisponible);
      if ((await tx.prestamo.count({ where: { piezaId: pieza.id, fechaDevolucionReal: null } })) > 0) {
        throw new ErrorDatos(MENSAJES.prestamoNoDisponible);
      }
      const rango = { inicio: datos.fechaSalida, fin: datos.fechaDevolucionPrevista };
      const expos = await tx.exposicion.findMany({ where: { cancelada: false, piezas: { some: { piezaId: pieza.id } } } });
      const cruza = expos.some((e) =>
        rangosSeCruzan(rangoExposicion({ fechaInicio: aDia(e.fechaInicio), fechaFin: aDia(e.fechaFin) }), rango),
      );
      if (cruza) throw new ErrorDatos(MENSAJES.prestamoNoDisponible);

      const fila = await tx.prestamo.create({
        data: {
          piezaId: pieza.id,
          usuarioId: datos.usuarioId,
          institucionDestino: datos.institucionDestino,
          responsableReceptor: datos.responsableReceptor,
          numeroConvenio: datos.numeroConvenio,
          numeroPoliza: datos.numeroPoliza,
          valorAsegurado: datos.valorAsegurado.toFixed(2),
          fechaSalida: aColumnaDia(datos.fechaSalida),
          fechaDevolucionPrevista: aColumnaDia(datos.fechaDevolucionPrevista),
          estadoConservacionSalida: datos.estadoConservacionSalida,
        },
      });
      // La pieza pasa a "en préstamo" en la misma transacción, para que la siguiente persona ya la vea ocupada
      await tx.pieza.update({ where: { id: pieza.id }, data: { disponibilidad: "en_prestamo" } });
      return aPrestamo(fila);
    });
  },
  async registrarDevolucion(organizacionId, id, datos) {
    const prisma = obtenerPrisma();
    // Actualización condicionada: solo si el préstamo sigue abierto. El conteo dice si esta llamada fue la que lo cerró.
    const filas = await prisma.prestamo.updateMany({
      where: { id, fechaDevolucionReal: null, pieza: { museo: { organizacionId } } },
      data: {
        fechaDevolucionReal: aColumnaDia(datos.fechaDevolucionReal),
        estadoConservacionDevolucion: datos.estadoConservacionDevolucion,
      },
    });
    if (filas.count > 0) return;
    // Cero filas: o no existe en esta organización (no hace nada) o ya estaba cerrado
    const existe = await prisma.prestamo.count({ where: { id, pieza: { museo: { organizacionId } } } });
    if (existe > 0) throw new ErrorDatos(MENSAJES.prestamoSinVigentes);
  },
};
