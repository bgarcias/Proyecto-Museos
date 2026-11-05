"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { exigirSesion } from "../auth/session";
import {
  CAMPO_ESTADO_CONSERVACION,
  ESTADOS_CONSERVACION,
  ETIQUETAS_DISPONIBILIDAD,
  ETIQUETAS_ESTADO_CONSERVACION,
  MENSAJE_SIN_ACCESO_MUSEO,
  MENSAJE_PIEZA_NO_ENCONTRADA,
} from "../constantes";
import {
  MAXIMO_CODIGO_ANTERIOR,
  MENSAJE_CODIGO_ANTERIOR_LARGO,
  MENSAJE_CODIGO_ANTERIOR_REPETIDO,
  compararCodigos,
} from "../codigos";
import {
  borrarImagenPieza,
  decodificarImagen,
  moverImagenPieza,
  nombreArchivoImagen,
  subirImagenPieza,
} from "../almacenamiento";
import { esNombreDeArchivoDeImagen } from "../imagenes";
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
import { coincideTexto } from "../busquedaTexto";
import { museosActivosVisibles, museosVisibles, piezasVisibles, puedeAccederAlMuseo } from "./acceso";
import { protegida } from "./errores";

const MENSAJE_IMAGEN = "La imagen debe ser PNG o JPG de máximo 1 MB";
const MENSAJE_SUBIDA_IMAGEN = "No se pudo subir la imagen. Intenta de nuevo";
const MENSAJE_IMAGEN_NO_GUARDADA = "La pieza se registró, pero no se pudo guardar su imagen. Edítala para agregarla";

/* Catálogo y búsqueda de piezas. El buscador se usa como página y como popup. */

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

/** Formulario para registrar (sin id) o editar (con id). Null si la pieza no existe o no hay acceso a su museo. */
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

/** La imagen llega como data URL (PNG o JPG, máximo 1 MB) y se sube al bucket. En la base solo se guarda el nombre del archivo. */
function imagenValida(imagen: string): boolean {
  return decodificarImagen(imagen) !== null;
}

export async function registrarPieza(
  entrada: EntradaPieza & { estadoConservacion: string; museoId: string },
): Promise<Resultado> {
  return protegida("registrarPieza", () => registrarPiezaInterno(entrada));
}

async function registrarPiezaInterno(
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
    return { ok: false, error: MENSAJE_SIN_ACCESO_MUSEO };
  }
  if (entrada.imagen && !imagenValida(entrada.imagen)) return { ok: false, error: MENSAJE_IMAGEN };
  if (codigoAnterior && (await datos.buscarPiezaPorCodigoAnterior(usuario.organizacionId, entrada.museoId, codigoAnterior))) {
    return { ok: false, error: MENSAJE_CODIGO_ANTERIOR_REPETIDO };
  }

  // El código lo asigna el sistema al crear la pieza: la imagen se sube con un nombre temporal y luego se renombra
  const imagen = entrada.imagen ? decodificarImagen(entrada.imagen) : null;
  let temporal: string | undefined;
  if (imagen) {
    temporal = `temporal-${randomUUID()}.${imagen.extension}`;
    if (!(await subirImagenPieza(temporal, imagen))) return { ok: false, error: MENSAJE_SUBIDA_IMAGEN };
  }

  // Registrar una pieza a mano no genera historial.
  let creada;
  try {
    creada = await datos.crearPieza(usuario.organizacionId, {
      codigoAnterior,
      nombre,
      categoriaId: entrada.categoriaId,
      descripcion: entrada.descripcion.trim() || undefined,
      anio,
      material: entrada.material.trim() || undefined,
      estadoConservacion: entrada.estadoConservacion as EstadoConservacion,
      ubicacionFisica: entrada.ubicacionFisica.trim() || undefined,
      imagenUrl: undefined,
      museoId: entrada.museoId,
    });
  } catch (error) {
    if (temporal) await borrarImagenPieza(temporal);
    throw error;
  }
  if (imagen && temporal) {
    const definitivo = nombreArchivoImagen(creada.codigo, imagen.extension);
    if (!(await moverImagenPieza(temporal, definitivo))) {
      await borrarImagenPieza(temporal);
      revalidatePath("/piezas");
      return { ok: false, error: MENSAJE_IMAGEN_NO_GUARDADA };
    }
    try {
      await datos.actualizarPieza(usuario.organizacionId, creada.id, { imagenUrl: definitivo });
    } catch (error) {
      console.error("registrarPieza: no se guardó el nombre de la imagen", error);
      await borrarImagenPieza(definitivo);
      revalidatePath("/piezas");
      return { ok: false, error: MENSAJE_IMAGEN_NO_GUARDADA };
    }
  }
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Pieza registrada correctamente" };
}

/**
 * El estado de conservación solo cambia desde Actualizar estado y el museo no se puede cambiar.
 * Cada campo modificado genera un registro de historial.
 */
export async function actualizarPieza(id: string, entrada: EntradaPieza): Promise<Resultado> {
  return protegida("actualizarPieza", () => actualizarPiezaInterno(id, entrada));
}

async function actualizarPiezaInterno(id: string, entrada: EntradaPieza): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = await datos.obtenerPieza(usuario.organizacionId, id);
  if (!pieza || !(await puedeAccederAlMuseo(datos, usuario, pieza.museoId))) {
    return { ok: false, error: MENSAJE_PIEZA_NO_ENCONTRADA };
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
    const otra = await datos.buscarPiezaPorCodigoAnterior(usuario.organizacionId, pieza.museoId, codigoAnterior);
    if (otra && otra.id !== id) return { ok: false, error: MENSAJE_CODIGO_ANTERIOR_REPETIDO };
  }

  const descripcion = entrada.descripcion.trim() || undefined;
  const material = entrada.material.trim() || undefined;
  const ubicacionFisica = entrada.ubicacionFisica.trim() || undefined;
  // La imagen nueva se sube antes de guardar nada: si falla, la pieza no cambia
  let imagenUrl = pieza.imagenUrl;
  let subida: string | undefined;
  if (entrada.imagen !== undefined) {
    const imagen = entrada.imagen ? decodificarImagen(entrada.imagen) : null;
    if (imagen) {
      subida = nombreArchivoImagen(pieza.codigo, imagen.extension);
      if (!(await subirImagenPieza(subida, imagen))) return { ok: false, error: MENSAJE_SUBIDA_IMAGEN };
      imagenUrl = subida;
    } else {
      imagenUrl = undefined;
    }
  }
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
  // Solo cuenta si había imagen antes y si hay después: un nombre de archivo nuevo no es por sí solo un cambio
  const habiaImagen = Boolean(pieza.imagenUrl);
  const hayImagen = Boolean(imagenUrl);
  if (entrada.imagen !== undefined && (habiaImagen || hayImagen)) {
    cambios.push({
      campo: "imagen",
      anterior: habiaImagen ? "con imagen" : "sin imagen",
      nuevo: !hayImagen ? "sin imagen" : habiaImagen ? "imagen reemplazada" : "con imagen",
    });
  }

  try {
    await datos.actualizarPieza(usuario.organizacionId, id, {
      codigoAnterior,
      nombre,
      categoriaId: categoria.id,
      descripcion,
      anio,
      material,
      ubicacionFisica,
      imagenUrl,
    });
  } catch (error) {
    // Si no se guardó la pieza, la imagen recién subida sobra
    if (subida) await borrarImagenPieza(subida);
    throw error;
  }
  // La imagen anterior ya no se usa: se borra solo si era un archivo del bucket
  if (imagenUrl !== pieza.imagenUrl && esNombreDeArchivoDeImagen(pieza.imagenUrl)) await borrarImagenPieza(pieza.imagenUrl);
  for (const c of cambios) {
    await datos.registrarCambio(usuario.organizacionId, {
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
  return protegida("actualizarEstado", () => actualizarEstadoInterno(piezaId, nuevoEstado));
}

async function actualizarEstadoInterno(
  piezaId: string,
  nuevoEstado: string,
): Promise<Resultado<{ estadoActual: EstadoConservacion }>> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = await datos.obtenerPieza(usuario.organizacionId, piezaId);
  if (!pieza || !(await puedeAccederAlMuseo(datos, usuario, pieza.museoId))) {
    return { ok: false, error: MENSAJE_PIEZA_NO_ENCONTRADA };
  }
  if (!(ESTADOS_CONSERVACION as readonly string[]).includes(nuevoEstado)) {
    return { ok: false, error: "Selecciona el nuevo estado" };
  }
  // Paso 3: el nuevo estado debe ser distinto del actual
  if (pieza.estadoConservacion === nuevoEstado) {
    return { ok: false, error: "El estado seleccionado es el mismo que el actual" };
  }

  await datos.actualizarEstadoPieza(usuario.organizacionId, piezaId, nuevoEstado as EstadoConservacion);
  await datos.registrarCambio(usuario.organizacionId, {
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

/** PDF de la ficha técnica. Solo con acceso al museo de la pieza; si no, null (no se encuentra). */
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
