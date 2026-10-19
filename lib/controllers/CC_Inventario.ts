"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "../auth/session";
import { CAMPO_DISPONIBILIDAD, CAMPO_ESTADO_CONSERVACION, RESULTADOS_INVENTARIO } from "../constantes";
import { obtenerDatos } from "../data";
import type { Datos } from "../data/contratos";
import type {
  DetalleInventario,
  FilaInventario,
  InventarioListado,
  Museo,
  Pieza,
  Resultado,
  ResultadoInventario,
  ResumenInventario,
  UsuarioPublico,
} from "../tipos";
import { museosActivosVisibles, museosVisibles } from "./utilidades";

/* Realizar Inventario Físico (sin ECU en el informe, sección 7.8) */

const MENSAJE_EN_CURSO = "Ya existe un inventario en curso para este museo";
const MENSAJE_INCOMPLETO = "Debe marcar todas las piezas antes de cerrar el inventario";

/** Inventarios de los museos a los que la persona tiene acceso, con museo y con quién lo inició y quién lo cerró. */
async function inventariosVisibles(datos: Datos, usuario: UsuarioPublico): Promise<InventarioListado[]> {
  const [inventarios, museos, usuarios] = await Promise.all([
    datos.listarInventarios(),
    museosVisibles(datos, usuario),
    datos.listarUsuarios(usuario.organizacionId),
  ]);
  const resultado: InventarioListado[] = [];
  for (const i of inventarios) {
    const museo = museos.find((m) => m.id === i.museoId);
    if (!museo) continue;
    const nombreDe = (id: string) => usuarios.find((u) => u.id === id)?.nombre ?? "Usuario desconocido";
    resultado.push({
      ...i,
      museoNombre: museo.nombre,
      iniciadoPorNombre: nombreDe(i.usuarioId),
      cerradoPorNombre: i.usuarioCierreId ? nombreDe(i.usuarioCierreId) : undefined,
    });
  }
  return resultado.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
}

/** Piezas esperadas de un museo: las del museo, menos las que están en préstamo. */
async function piezasEsperadas(datos: Datos, museoId: string): Promise<Pieza[]> {
  const piezas = await datos.listarPiezas();
  return piezas
    .filter((p) => p.museoId === museoId && p.disponibilidad !== "en_prestamo")
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));
}

function aFila(pieza: Pieza, detalle?: DetalleInventario): FilaInventario {
  return {
    piezaId: pieza.id,
    codigo: pieza.codigo,
    nombre: pieza.nombre,
    ubicacionFisica: pieza.ubicacionFisica,
    imagenUrl: pieza.imagenUrl,
    resultado: detalle?.resultado,
    observacion: detalle?.observacion,
  };
}

function resumir(filas: FilaInventario[]): ResumenInventario {
  return {
    encontradas: filas.filter((f) => f.resultado === "encontrada").length,
    noEncontradas: filas.filter((f) => f.resultado === "no_encontrada"),
    conDano: filas.filter((f) => f.resultado === "con_dano"),
  };
}

/* Lista de inventarios y Nuevo inventario */

export async function cargarInventarios(): Promise<{ inventarios: InventarioListado[]; museos: Museo[] }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return { inventarios: await inventariosVisibles(datos, usuario), museos: await museosActivosVisibles(datos, usuario) };
}

/** Paso 3: se elige el museo (activo y asignado) y se crea el inventario en curso. Devuelve su id. */
export async function crearInventario(museoId: string): Promise<Resultado<{ id: string }>> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const museo = (await museosActivosVisibles(datos, usuario)).find((m) => m.id === museoId);
  if (!museo) return { ok: false, error: "Selecciona el museo del inventario" };

  const enCurso = (await datos.listarInventarios()).some((i) => i.museoId === museo.id && i.estado === "en_curso");
  if (enCurso) return { ok: false, error: MENSAJE_EN_CURSO };

  const inventario = await datos.crearInventario({
    museoId: museo.id,
    usuarioId: usuario.id,
    fechaInicio: new Date().toISOString(),
  });
  revalidatePath("/inventarios");
  return { ok: true, datos: { id: inventario.id } };
}

/* Conteo y cierre */

/**
 * Datos de un inventario. En curso: las piezas esperadas con las marcas ya guardadas.
 * Cerrado: las piezas que se contaron, en solo lectura, con su resumen.
 * Devuelve null si no existe o la persona no tiene acceso a su museo.
 */
export async function cargarInventario(
  id: string,
): Promise<{ inventario: InventarioListado; filas: FilaInventario[]; resumen: ResumenInventario | null } | null> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const inventario = (await inventariosVisibles(datos, usuario)).find((i) => i.id === id);
  if (!inventario) return null;

  const detalles = await datos.listarDetalleInventario(id);
  const piezas = await datos.listarPiezas();
  const detalleDe = (piezaId: string) => detalles.find((d) => d.piezaId === piezaId);

  if (inventario.estado === "cerrado") {
    const filas = detalles
      .map((d) => piezas.find((p) => p.id === d.piezaId))
      .filter((p): p is Pieza => Boolean(p))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"))
      .map((p) => aFila(p, detalleDe(p.id)));
    return { inventario, filas, resumen: resumir(filas) };
  }
  const filas = (await piezasEsperadas(datos, inventario.museoId)).map((p) => aFila(p, detalleDe(p.id)));
  return { inventario, filas, resumen: null };
}

/** Cada marca se guarda al marcarla, así se puede retomar un inventario en curso. */
export async function marcarPieza(
  inventarioId: string,
  piezaId: string,
  resultado: string,
  observacion: string,
): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const inventario = (await inventariosVisibles(datos, usuario)).find((i) => i.id === inventarioId);
  if (!inventario) return { ok: false, error: "No se encontró el inventario" };
  if (inventario.estado !== "en_curso") return { ok: false, error: "No es posible modificar un inventario cerrado" };
  if (!(RESULTADOS_INVENTARIO as readonly string[]).includes(resultado)) {
    return { ok: false, error: "Selecciona el resultado de la pieza" };
  }
  const esperada = (await piezasEsperadas(datos, inventario.museoId)).some((p) => p.id === piezaId);
  if (!esperada) return { ok: false, error: "La pieza no forma parte de este inventario" };

  await datos.marcarResultadoInventario(inventarioId, piezaId, resultado as ResultadoInventario, observacion.trim() || undefined);
  return { ok: true };
}

/**
 * Cierra el inventario. No se puede cerrar hasta que todas las piezas esperadas estén marcadas.
 * Al cerrar: las no encontradas pasan a pendiente de verificación; toda pieza encontrada (Encontrada o Con daño)
 * que estaba pendiente de verificación vuelve a disponible; las marcadas Con daño pasan a estado malo si no
 * lo estaban. Cada cambio se registra en el historial. Puede cerrarlo cualquier persona con acceso al museo del
 * inventario, y queda registrada como quien lo cerró.
 */
export async function cerrarInventario(id: string): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const inventario = (await inventariosVisibles(datos, usuario)).find((i) => i.id === id);
  if (!inventario) return { ok: false, error: "No se encontró el inventario" };
  if (inventario.estado !== "en_curso") return { ok: false, error: "No es posible modificar un inventario cerrado" };

  const detalles = await datos.listarDetalleInventario(id);
  const esperadas = await piezasEsperadas(datos, inventario.museoId);
  if (!esperadas.every((p) => detalles.some((d) => d.piezaId === p.id))) {
    return { ok: false, error: MENSAJE_INCOMPLETO };
  }

  for (const d of detalles) {
    const pieza = await datos.obtenerPieza(d.piezaId);
    if (!pieza) continue;
    if (d.resultado === "no_encontrada") {
      if (pieza.disponibilidad !== "pendiente_verificacion") {
        await datos.actualizarDisponibilidadPieza(pieza.id, "pendiente_verificacion");
        await datos.registrarCambio({
          piezaId: pieza.id,
          usuarioId: usuario.id,
          campoModificado: CAMPO_DISPONIBILIDAD,
          valorAnterior: pieza.disponibilidad,
          valorNuevo: "pendiente_verificacion",
        });
      }
      continue;
    }
    // Toda pieza encontrada (marcada Encontrada o Con daño) que estaba pendiente de verificación vuelve a disponible
    if (pieza.disponibilidad === "pendiente_verificacion") {
      await datos.actualizarDisponibilidadPieza(pieza.id, "disponible");
      await datos.registrarCambio({
        piezaId: pieza.id,
        usuarioId: usuario.id,
        campoModificado: CAMPO_DISPONIBILIDAD,
        valorAnterior: "pendiente_verificacion",
        valorNuevo: "disponible",
      });
    }
    // Si además está marcada Con daño, pasa a estado de conservación malo si no lo estaba
    if (d.resultado === "con_dano" && pieza.estadoConservacion !== "malo") {
      await datos.actualizarEstadoPieza(pieza.id, "malo");
      await datos.registrarCambio({
        piezaId: pieza.id,
        usuarioId: usuario.id,
        campoModificado: CAMPO_ESTADO_CONSERVACION,
        valorAnterior: pieza.estadoConservacion,
        valorNuevo: "malo",
      });
    }
  }
  await datos.cerrarInventario(id, new Date().toISOString(), usuario.id);
  revalidatePath("/inventarios");
  revalidatePath(`/inventarios/${id}`);
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Inventario cerrado correctamente" };
}
