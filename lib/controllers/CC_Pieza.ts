"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { exigirSesion } from "../auth/session";
import {
  CAMPO_ESTADO_CONSERVACION,
  ESTADOS_CONSERVACION,
  ETIQUETAS_DISPONIBILIDAD,
  ETIQUETAS_ESTADO_CONSERVACION,
} from "../constantes";
import {
  MAXIMO_CODIGO_ANTERIOR,
  MENSAJE_CODIGO_ANTERIOR_LARGO,
  MENSAJE_CODIGO_ANTERIOR_REPETIDO,
  compararCodigos,
} from "../codigos";
import { obtenerDatos } from "../data";
import { formatearFecha, formatearFechaHora } from "../fechas";
import { renderizarFicha } from "../exportacion/ficha";
import type {
  Categoria,
  EstadoConservacion,
  FiltrosPiezas,
  Museo,
  PiezaListado,
  Resultado,
} from "../tipos";
import { anioActual, validarAnio } from "../validaciones";
import { coincideTexto, museosActivosVisibles, museosVisibles, piezasVisibles, puedeAccederAlMuseo } from "./acceso";

const MENSAJE_IMAGEN = "La imagen debe ser PNG o JPG de máximo 1 MB";
const MAXIMO_IMAGEN_BYTES = 1024 * 1024;

/* Catálogo y búsqueda de piezas. El buscador se usa como página y como ventana emergente. */

export async function buscarPiezas(filtros: FiltrosPiezas): Promise<PiezaListado[]> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const piezas = await piezasVisibles(datos, usuario);
  return piezas
    .filter(
      (p) =>
        (coincideTexto(p.codigo, filtros.codigo) || coincideTexto(p.codigoAnterior, filtros.codigo)) &&
        coincideTexto(p.nombre, filtros.nombre) &&
        (!filtros.categoriaId || p.categoriaId === filtros.categoriaId) &&
        (!filtros.estado || p.estadoConservacion === filtros.estado) &&
        (!filtros.disponibilidad || p.disponibilidad === filtros.disponibilidad) &&
        (!filtros.soloDisponibles || p.disponibilidad === "disponible") &&
        (!filtros.museoId || p.museoId === filtros.museoId),
    )
    .sort((a, b) => compararCodigos(a.codigo, b.codigo));
}

export async function cargarCatalogo(): Promise<{
  piezas: PiezaListado[];
  museos: Museo[];
  categorias: Categoria[];
}> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return {
    piezas: await buscarPiezas({}),
    museos: await museosVisibles(datos, usuario),
    categorias: await datos.listarCategorias(usuario.organizacionId),
  };
}

/** Datos de la pantalla de detalle. Una pieza inexistente o de un museo no asignado responde 404, como las demás rutas de pieza. */
export async function cargarDetallePieza(id: string): Promise<PiezaListado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = (await piezasVisibles(datos, usuario)).find((p) => p.id === id);
  if (!pieza) notFound();
  return pieza;
}

/* Gestionar piezas: registrar y editar */

/**
 * Datos del formulario de pieza, para registrar (sin id) o editar (con id).
 * Devuelve null si la pieza no existe o la persona no tiene acceso a su museo.
 */
export async function cargarFormularioPieza(
  id?: string,
): Promise<{ museos: Museo[]; categorias: Categoria[]; pieza: PiezaListado | null; anioMaximo: number } | null> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const categorias = await datos.listarCategorias(usuario.organizacionId);
  const anioMaximo = anioActual();
  if (!id) return { museos: await museosActivosVisibles(datos, usuario), categorias, pieza: null, anioMaximo };

  const pieza = (await piezasVisibles(datos, usuario)).find((p) => p.id === id);
  if (!pieza) return null;
  return { museos: await museosVisibles(datos, usuario), categorias, pieza, anioMaximo };
}

type EntradaPieza = {
  /** Opcional, de máximo 40 caracteres. El código de la pieza lo asigna el sistema y no viaja en la entrada. */
  codigoAnterior: string;
  nombre: string;
  categoriaId: string;
  descripcion: string;
  anio: string;
  material: string;
  ubicacionFisica: string;
  /** undefined: sin cambio. null: quitar la imagen. Texto: imagen nueva como data URL. */
  imagen?: string | null;
};

/** La imagen se guarda como data URL (PNG o JPG, máximo 1 MB) mientras el prototipo use memoria. */
function imagenValida(imagen: string): boolean {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(imagen);
  if (!m) return false;
  const relleno = m[2].endsWith("==") ? 2 : m[2].endsWith("=") ? 1 : 0;
  const bytes = Math.floor((m[2].length * 3) / 4) - relleno;
  return bytes <= MAXIMO_IMAGEN_BYTES;
}

export async function registrarPieza(
  entrada: EntradaPieza & { estadoConservacion: string; museoId: string },
): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const codigoAnterior = entrada.codigoAnterior.trim() || undefined;
  const nombre = entrada.nombre.trim();
  if (!nombre) return { ok: false, error: "Ingresa el nombre de la pieza" };
  if (codigoAnterior && codigoAnterior.length > MAXIMO_CODIGO_ANTERIOR) {
    return { ok: false, error: MENSAJE_CODIGO_ANTERIOR_LARGO };
  }

  const categorias = await datos.listarCategorias(usuario.organizacionId);
  if (!categorias.some((c) => c.id === entrada.categoriaId)) {
    return { ok: false, error: "Selecciona una categoría" };
  }
  const validacionAnio = validarAnio(entrada.anio);
  if (!validacionAnio.ok) return { ok: false, error: validacionAnio.error };
  const anio = validacionAnio.anio;
  if (!(ESTADOS_CONSERVACION as readonly string[]).includes(entrada.estadoConservacion)) {
    return { ok: false, error: "Selecciona el estado de conservación" };
  }
  if (!entrada.museoId) return { ok: false, error: "Selecciona un museo" };
  if (!(await puedeAccederAlMuseo(datos, usuario, entrada.museoId))) {
    return { ok: false, error: "No tienes acceso al museo seleccionado" };
  }
  if (entrada.imagen && !imagenValida(entrada.imagen)) return { ok: false, error: MENSAJE_IMAGEN };
  if (codigoAnterior && (await datos.buscarPiezaPorCodigoAnterior(entrada.museoId, codigoAnterior))) {
    return { ok: false, error: MENSAJE_CODIGO_ANTERIOR_REPETIDO };
  }

  // Registrar una pieza a mano no genera historial.
  await datos.crearPieza({
    codigoAnterior,
    nombre,
    categoriaId: entrada.categoriaId,
    descripcion: entrada.descripcion.trim() || undefined,
    anio,
    material: entrada.material.trim() || undefined,
    estadoConservacion: entrada.estadoConservacion as EstadoConservacion,
    ubicacionFisica: entrada.ubicacionFisica.trim() || undefined,
    imagenUrl: entrada.imagen || undefined,
    museoId: entrada.museoId,
  });
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Pieza registrada correctamente" };
}

/**
 * Editar una pieza. El estado de conservación se cambia solo desde Actualizar estado
 * y el museo de una pieza no se puede cambiar. Cada campo que cambia genera un registro de historial.
 */
export async function actualizarPieza(id: string, entrada: EntradaPieza): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = await datos.obtenerPieza(id);
  if (!pieza || !(await puedeAccederAlMuseo(datos, usuario, pieza.museoId))) {
    return { ok: false, error: "No se encontró la pieza" };
  }
  const codigoAnterior = entrada.codigoAnterior.trim() || undefined;
  const nombre = entrada.nombre.trim();
  if (!nombre) return { ok: false, error: "Ingresa el nombre de la pieza" };
  if (codigoAnterior && codigoAnterior.length > MAXIMO_CODIGO_ANTERIOR) {
    return { ok: false, error: MENSAJE_CODIGO_ANTERIOR_LARGO };
  }

  const categorias = await datos.listarCategorias(usuario.organizacionId);
  const categoria = categorias.find((c) => c.id === entrada.categoriaId);
  if (!categoria) return { ok: false, error: "Selecciona una categoría" };
  const validacionAnio = validarAnio(entrada.anio);
  if (!validacionAnio.ok) return { ok: false, error: validacionAnio.error };
  const anio = validacionAnio.anio;
  if (entrada.imagen && !imagenValida(entrada.imagen)) return { ok: false, error: MENSAJE_IMAGEN };
  if (codigoAnterior) {
    const otra = await datos.buscarPiezaPorCodigoAnterior(pieza.museoId, codigoAnterior);
    if (otra && otra.id !== id) return { ok: false, error: MENSAJE_CODIGO_ANTERIOR_REPETIDO };
  }

  const descripcion = entrada.descripcion.trim() || undefined;
  const material = entrada.material.trim() || undefined;
  const ubicacionFisica = entrada.ubicacionFisica.trim() || undefined;
  const imagenUrl = entrada.imagen === undefined ? pieza.imagenUrl : entrada.imagen || undefined;
  const categoriaAnterior = categorias.find((c) => c.id === pieza.categoriaId)?.nombre;

  // Campo modificado (en minúscula), valor anterior y valor nuevo, como texto libre
  const cambios: { campo: string; anterior?: string; nuevo?: string }[] = [];
  const comparar = (campo: string, anterior: string | undefined, nuevo: string | undefined) => {
    if ((anterior ?? "") !== (nuevo ?? "")) cambios.push({ campo, anterior, nuevo });
  };
  comparar("código anterior", pieza.codigoAnterior, codigoAnterior);
  comparar("nombre", pieza.nombre, nombre);
  comparar("categoría", categoriaAnterior, categoria.nombre);
  comparar("descripción", pieza.descripcion, descripcion);
  comparar("año", pieza.anio?.toString(), anio?.toString());
  comparar("material", pieza.material, material);
  comparar("ubicación física", pieza.ubicacionFisica, ubicacionFisica);
  if (imagenUrl !== pieza.imagenUrl) {
    cambios.push({
      campo: "imagen",
      anterior: pieza.imagenUrl ? "con imagen" : "sin imagen",
      nuevo: !imagenUrl ? "sin imagen" : pieza.imagenUrl ? "imagen reemplazada" : "con imagen",
    });
  }

  await datos.actualizarPieza(id, {
    codigoAnterior,
    nombre,
    categoriaId: categoria.id,
    descripcion,
    anio,
    material,
    ubicacionFisica,
    imagenUrl,
  });
  for (const c of cambios) {
    await datos.registrarCambio({
      piezaId: id,
      usuarioId: usuario.id,
      campoModificado: c.campo,
      valorAnterior: c.anterior,
      valorNuevo: c.nuevo,
    });
  }
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Pieza actualizada correctamente" };
}

/* ECUS03: Actualizar Estado de Conservación de una Pieza */

export async function cargarActualizarEstado(piezaId: string): Promise<PiezaListado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = (await piezasVisibles(datos, usuario)).find((p) => p.id === piezaId);
  if (!pieza) notFound();
  return pieza;
}

export async function actualizarEstado(
  piezaId: string,
  nuevoEstado: string,
): Promise<Resultado<{ estadoActual: EstadoConservacion }>> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = await datos.obtenerPieza(piezaId);
  if (!pieza || !(await puedeAccederAlMuseo(datos, usuario, pieza.museoId))) {
    return { ok: false, error: "No se encontró la pieza" };
  }
  if (!(ESTADOS_CONSERVACION as readonly string[]).includes(nuevoEstado)) {
    return { ok: false, error: "Selecciona el nuevo estado" };
  }
  // Paso 3: el nuevo estado debe ser distinto del actual
  if (pieza.estadoConservacion === nuevoEstado) {
    return { ok: false, error: "El estado seleccionado es el mismo que el actual" };
  }

  await datos.actualizarEstadoPieza(piezaId, nuevoEstado as EstadoConservacion);
  await datos.registrarCambio({
    piezaId,
    usuarioId: usuario.id,
    campoModificado: CAMPO_ESTADO_CONSERVACION,
    valorAnterior: pieza.estadoConservacion,
    valorNuevo: nuevoEstado,
  });
  revalidatePath("/piezas");
  return {
    ok: true,
    mensaje: "Estado de conservación actualizado correctamente",
    datos: { estadoActual: nuevoEstado as EstadoConservacion },
  };
}

/* Ficha técnica en PDF */

/**
 * PDF de la ficha técnica de una pieza. Solo la genera quien tiene acceso al museo de la pieza;
 * en otro caso devuelve null (no se encuentra).
 */
export async function generarFichaTecnica(id: string): Promise<{ nombreArchivo: string; contenido: Uint8Array } | null> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = (await piezasVisibles(datos, usuario)).find((p) => p.id === id);
  if (!pieza) return null;

  const contenido = await renderizarFicha({
    museo: pieza.museoNombre,
    nombre: pieza.nombre,
    codigo: pieza.codigo,
    codigoAnterior: pieza.codigoAnterior,
    imagenUrl: pieza.imagenUrl,
    categoria: pieza.categoriaNombre,
    descripcion: pieza.descripcion,
    anio: pieza.anio,
    material: pieza.material,
    estadoConservacion: ETIQUETAS_ESTADO_CONSERVACION[pieza.estadoConservacion],
    ubicacionFisica: pieza.ubicacionFisica,
    disponibilidad: ETIQUETAS_DISPONIBILIDAD[pieza.disponibilidad],
    fechaRegistro: formatearFecha(pieza.fechaRegistro),
    fechaGeneracion: formatearFechaHora(new Date().toISOString()),
  });
  // El nombre del archivo es "ficha-tecnica-" seguido del código, sin caracteres que no sean seguros en un nombre de archivo
  const codigoSeguro = pieza.codigo.replace(/[^A-Za-z0-9_-]/g, "_");
  return { nombreArchivo: `ficha-tecnica-${codigoSeguro}.pdf`, contenido };
}
