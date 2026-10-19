import { ErrorDatos } from "../errores";
import { obtenerPrisma } from "./cliente";
import { Prisma } from "./generado/client";

export type Tx = Prisma.TransactionClient;

/** Fecha de solo día (AAAA-MM-DD) a la columna date, sin ningún desplazamiento de zona. */
export const aColumnaDia = (dia: string): Date => new Date(`${dia}T00:00:00.000Z`);

/** Transacción de todo o nada. El tiempo de espera cubre una importación de 500 piezas con la latencia de la red. */
export function enTransaccion<T>(operacion: (tx: Tx) => Promise<T>): Promise<T> {
  return obtenerPrisma().$transaction(operacion, { maxWait: 10_000, timeout: 30_000 });
}

/** Bloquea las piezas hasta el final de la transacción, siempre en orden de id para no cruzar bloqueos entre sí. */
export async function bloquearPiezas(tx: Tx, ids: string[]): Promise<void> {
  const ordenadas = [...new Set(ids)].sort();
  if (ordenadas.length === 0) return;
  await tx.$queryRaw`select id from pieza where id in (${Prisma.join(ordenadas.map((id) => Prisma.sql`${id}::uuid`))}) order by id for update`;
}

/** Bloquea una fila de inventario hasta el final de la transacción. */
export async function bloquearInventario(tx: Tx, id: string): Promise<void> {
  await tx.$queryRaw`select id from inventario where id = ${id}::uuid for update`;
}

/** Lo que lanzan las creaciones y escrituras cuando algo referenciado es de otra organización. */
export function fuera(entidad: string): never {
  throw new ErrorDatos(`${entidad} no pertenece a la organización`);
}

/** Exige que todos los museos existan dentro de la organización. */
export async function exigirMuseos(tx: Tx, organizacionId: string, ids: string[]): Promise<void> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  if ((await tx.museo.count({ where: { id: { in: unicos }, organizacionId } })) !== unicos.length) fuera("El museo");
}

/** Exige que todas las piezas existan dentro de la organización (a través de su museo). */
export async function exigirPiezas(tx: Tx, organizacionId: string, ids: string[]): Promise<void> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  if ((await tx.pieza.count({ where: { id: { in: unicos }, museo: { organizacionId } } })) !== unicos.length) fuera("La pieza");
}

/** Exige que todas las categorías existan dentro de la organización. */
export async function exigirCategorias(tx: Tx, organizacionId: string, ids: string[]): Promise<void> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  if ((await tx.categoria.count({ where: { id: { in: unicos }, organizacionId } })) !== unicos.length) fuera("La categoría");
}

/** Exige que todos los usuarios existan dentro de la organización. */
export async function exigirUsuarios(tx: Tx, organizacionId: string, ids: string[]): Promise<void> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return;
  if ((await tx.usuario.count({ where: { id: { in: unicos }, organizacionId } })) !== unicos.length) fuera("El usuario");
}
