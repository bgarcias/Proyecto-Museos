import type { Datos } from "../contratos";
import { obtenerPrisma } from "./cliente";
import { enTransaccion, exigirMuseos } from "./comun";
import { aUsuario } from "./conversiones";
import type { Prisma } from "./generado/client";

const CON_MUSEOS = { museos: { select: { museoId: true } } } as const;

export const usuarios: Pick<
  Datos,
  | "listarUsuarios"
  | "obtenerUsuario"
  | "obtenerUsuarioPorId"
  | "obtenerUsuarioPorEmail"
  | "crearUsuario"
  | "actualizarUsuario"
  | "cambiarActivoUsuario"
> = {
  async listarUsuarios(organizacionId) {
    const filas = await obtenerPrisma().usuario.findMany({ where: { organizacionId }, include: CON_MUSEOS });
    return filas.map(aUsuario).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  },
  async obtenerUsuario(organizacionId, id) {
    const fila = await obtenerPrisma().usuario.findFirst({ where: { id, organizacionId }, include: CON_MUSEOS });
    return fila ? aUsuario(fila) : null;
  },
  async obtenerUsuarioPorId(id) {
    const fila = await obtenerPrisma().usuario.findUnique({ where: { id }, include: CON_MUSEOS });
    return fila ? aUsuario(fila) : null;
  },
  async obtenerUsuarioPorEmail(email) {
    // findFirst y no findUnique: el único real es sobre lower(email)
    const fila = await obtenerPrisma().usuario.findFirst({
      where: { email: { equals: email.trim().toLowerCase(), mode: "insensitive" } },
      include: CON_MUSEOS,
    });
    return fila ? aUsuario(fila) : null;
  },
  async crearUsuario(organizacionId, datos) {
    const id = datos.id;
    const museoIds = [...new Set(datos.museoIds)];
    return enTransaccion(async (tx) => {
      await exigirMuseos(tx, organizacionId, museoIds);
      const fila = await tx.usuario.create({
        data: {
          id,
          organizacionId,
          nombre: datos.nombre,
          email: datos.email.trim().toLowerCase(),
          rol: datos.rol,
          activo: datos.activo,
          museos: { create: museoIds.map((museoId) => ({ museoId })) },
        },
        include: CON_MUSEOS,
      });
      return aUsuario(fila);
    });
  },
  async actualizarUsuario(organizacionId, id, cambios) {
    const data: Prisma.UsuarioUpdateManyMutationInput = {};
    if (cambios.nombre !== undefined) data.nombre = cambios.nombre;
    if (cambios.email !== undefined) data.email = cambios.email.trim().toLowerCase();
    if (cambios.rol !== undefined) data.rol = cambios.rol;
    await enTransaccion(async (tx) => {
      // Actualización condicionada a la organización: si no existe o es de otra, no cambia nada
      const filas = await tx.usuario.updateMany({ where: { id, organizacionId }, data });
      if (filas.count === 0) return;
      if (cambios.museoIds) {
        const museoIds = [...new Set(cambios.museoIds)];
        await exigirMuseos(tx, organizacionId, museoIds);
        await tx.usuarioMuseo.deleteMany({ where: { usuarioId: id } });
        await tx.usuarioMuseo.createMany({ data: museoIds.map((museoId) => ({ usuarioId: id, museoId })) });
      }
    });
  },
  async cambiarActivoUsuario(organizacionId, id, activo) {
    await obtenerPrisma().usuario.updateMany({ where: { id, organizacionId }, data: { activo } });
  },
};
