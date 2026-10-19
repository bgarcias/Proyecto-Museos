import type { Datos } from "../data/contratos";
import { estadoExposicion, hoyISO, situacionPrestamo } from "../fechas";
import type { ExposicionListado, Museo, PiezaListado, PrestamoListado, UsuarioPublico } from "../tipos";

/*
 * Apoyo de los controladores, no se llama desde las vistas. Toda lectura se filtra por la organización de la sesión:
 * el administrador ve todos los museos y el colaborador, solo los asignados.
 */

/** Acceso a un museo, siempre dentro de la organización. Administrador: todos; colaborador: los asignados. */
export function puedeAccederMuseo(usuario: UsuarioPublico, museo: Pick<Museo, "id" | "organizacionId">): boolean {
  if (museo.organizacionId !== usuario.organizacionId) return false;
  return usuario.rol === "administrador" || usuario.museoIds.includes(museo.id);
}

/** Museos a los que la persona tiene acceso, activos o no. */
export async function museosVisibles(datos: Datos, usuario: UsuarioPublico): Promise<Museo[]> {
  const museos = await datos.listarMuseos(usuario.organizacionId);
  return museos.filter((m) => puedeAccederMuseo(usuario, m));
}

/** Museos activos a los que la persona tiene acceso, para las listas de selección de formularios nuevos. */
export async function museosActivosVisibles(datos: Datos, usuario: UsuarioPublico): Promise<Museo[]> {
  return (await museosVisibles(datos, usuario)).filter((m) => m.activo);
}

export async function puedeAccederAlMuseo(datos: Datos, usuario: UsuarioPublico, museoId: string): Promise<boolean> {
  const museo = await datos.obtenerMuseo(museoId);
  return museo !== null && puedeAccederMuseo(usuario, museo);
}

/** Piezas de los museos a los que la persona tiene acceso, con museo, categoría y situación (exhibición o almacén). */
export async function piezasVisibles(datos: Datos, usuario: UsuarioPublico): Promise<PiezaListado[]> {
  const [piezas, museos, categorias, exposiciones] = await Promise.all([
    datos.listarPiezas(),
    museosVisibles(datos, usuario),
    datos.listarCategorias(usuario.organizacionId),
    datos.listarExposiciones(),
  ]);
  // Una exposición cancelada tiene estado "cancelada", así que no cuenta como vigente.
  const enExhibicion = new Set<string>();
  for (const e of exposiciones) {
    if (estadoExposicion(e) === "vigente") e.piezaIds.forEach((id) => enExhibicion.add(id));
  }
  const resultado: PiezaListado[] = [];
  for (const p of piezas) {
    const museo = museos.find((m) => m.id === p.museoId);
    if (!museo) continue;
    resultado.push({
      ...p,
      museoNombre: museo.nombre,
      categoriaNombre: categorias.find((c) => c.id === p.categoriaId)?.nombre ?? "",
      enExhibicion: enExhibicion.has(p.id),
    });
  }
  return resultado;
}

/** Exposiciones de los museos a los que la persona tiene acceso, con estado calculado. */
export async function exposicionesVisibles(datos: Datos, usuario: UsuarioPublico): Promise<ExposicionListado[]> {
  const [exposiciones, museos] = await Promise.all([datos.listarExposiciones(), museosVisibles(datos, usuario)]);
  const resultado: ExposicionListado[] = [];
  for (const e of exposiciones) {
    const museo = museos.find((m) => m.id === e.museoId);
    if (!museo) continue;
    resultado.push({ ...e, museoNombre: museo.nombre, estado: estadoExposicion(e), cantidadPiezas: e.piezaIds.length });
  }
  return resultado;
}

/** Préstamos de las piezas de los museos a los que la persona tiene acceso, con pieza, museo y situación calculada. */
export async function prestamosVisibles(datos: Datos, usuario: UsuarioPublico): Promise<PrestamoListado[]> {
  const [prestamos, piezas] = await Promise.all([datos.listarPrestamos(), piezasVisibles(datos, usuario)]);
  const hoy = hoyISO();
  const resultado: PrestamoListado[] = [];
  for (const p of prestamos) {
    const pieza = piezas.find((x) => x.id === p.piezaId);
    if (!pieza) continue;
    resultado.push({
      ...p,
      museoId: pieza.museoId,
      piezaCodigo: pieza.codigo,
      piezaNombre: pieza.nombre,
      museoNombre: pieza.museoNombre,
      situacion: situacionPrestamo(p, hoy),
    });
  }
  return resultado.sort((a, b) => b.fechaSalida.localeCompare(a.fechaSalida));
}
