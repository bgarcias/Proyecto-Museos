"use server";

import { exigirSesion } from "../auth/session";
import {
  COLUMNAS_REPORTE_EXPOSICIONES,
  COLUMNAS_REPORTE_PIEZAS,
  COLUMNAS_REPORTE_PRESTAMOS,
  DISPONIBILIDADES,
  ESTADOS_CONSERVACION,
  ETIQUETAS_DISPONIBILIDAD,
  ETIQUETAS_ESTADO_CONSERVACION,
  ETIQUETAS_ESTADO_EXPOSICION,
  ETIQUETAS_FILTROS_REPORTE,
  ETIQUETAS_SITUACION_PRESTAMO,
  MENSAJE_FECHA_FORMATO,
  MENSAJE_FILTRO_INVALIDO,
  MENSAJE_SIN_ACCESO_MUSEO,
  MENSAJE_SIN_RESULTADOS,
  TEXTO_SIN_LIMITE,
  TEXTO_TODAS,
  TEXTO_TODOS,
  TITULO_REPORTE_EXPOSICIONES,
  TITULO_REPORTE_PIEZAS,
  TITULO_REPORTE_PRESTAMOS,
  TOTAL_EXPOSICIONES,
  TOTAL_PIEZAS,
  TOTAL_PRESTAMOS,
  errorDeRangoFechas,
  esFechaIso,
} from "../constantes";
import { compararCodigos } from "../codigos";
import { obtenerDatos } from "../data";
import { generarExcelReporte, generarPdfReporte } from "../exportacionReporte";
import { generarExcelTabla, generarPdfTabla, type DatosTabla } from "../exportacionTabla";
import { diaLocal, diaSiguiente, formatearFecha, formatearFechaHora, hoyISO, rangoExposicion, rangosSeCruzan } from "../fechas";
import type { Datos } from "../data/contratos";
import type {
  Categoria,
  FilaReporte,
  FilaReporteExposiciones,
  FilaReportePiezas,
  FilaReportePrestamos,
  FiltrosReporte,
  FiltrosReporteExposiciones,
  FiltrosReportePiezas,
  FiltrosReportePrestamos,
  Museo,
  Reporte,
  ReporteExposiciones,
  ReportePiezas,
  ReportePrestamos,
  Resultado,
  UsuarioPublico,
} from "../tipos";
import { coincideTexto, exposicionesVisibles, museosVisibles, piezasVisibles, prestamosVisibles } from "./utilidades";

/* ECUS02: Generar Reporte de Inventario por Categoría y Estado */

export async function cargarReporte(): Promise<{ categorias: Categoria[] }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return { categorias: await datos.listarCategorias(usuario.organizacionId) };
}

/**
 * Lógica única del reporte: valida el rango de fechas, filtra las piezas de los museos que la persona puede ver
 * y agrupa por categoría y estado. La usan la pantalla y las exportaciones, para que nunca difieran.
 */
async function calcularReporte(usuario: UsuarioPublico, filtros: FiltrosReporte): Promise<Resultado<Reporte>> {
  const errorRango = errorDeRangoFechas(filtros.desde, filtros.hasta);
  if (errorRango) return { ok: false, error: errorRango };

  const datos = await obtenerDatos();
  const piezas = (await piezasVisibles(datos, usuario)).filter((p) => {
    const dia = diaLocal(p.fechaRegistro);
    return (
      (!filtros.categoriaId || p.categoriaId === filtros.categoriaId) &&
      (!filtros.estado || p.estadoConservacion === filtros.estado) &&
      (!filtros.desde || dia >= filtros.desde) &&
      (!filtros.hasta || dia <= filtros.hasta)
    );
  });

  if (piezas.length === 0) {
    return { ok: false, error: MENSAJE_SIN_RESULTADOS };
  }

  const estados = [...ESTADOS_CONSERVACION];
  const porCategoria = new Map<string, FilaReporte>();
  const totalesPorEstado: Record<string, number> = Object.fromEntries(estados.map((e) => [e, 0]));
  for (const p of piezas) {
    const fila =
      porCategoria.get(p.categoriaNombre) ??
      { categoria: p.categoriaNombre, porEstado: Object.fromEntries(estados.map((e) => [e, 0])), total: 0 };
    fila.porEstado[p.estadoConservacion] += 1;
    fila.total += 1;
    totalesPorEstado[p.estadoConservacion] += 1;
    porCategoria.set(p.categoriaNombre, fila);
  }

  const filas = [...porCategoria.values()].sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));
  return { ok: true, datos: { estados, filas, totalesPorEstado, totalGeneral: piezas.length } };
}

export async function generarReporte(filtros: FiltrosReporte): Promise<Resultado<Reporte>> {
  const usuario = await exigirSesion();
  return calcularReporte(usuario, filtros);
}

export type ArchivoReporte =
  | { ok: true; nombreArchivo: string; tipoContenido: string; contenido: Uint8Array }
  | { ok: false; error: string };

/**
 * Exporta el reporte en PDF o Excel. El servidor lo recalcula con los filtros recibidos y la sesión de la persona,
 * sin confiar en los datos de la pantalla. Con filtros inválidos o sin resultados devuelve el error y no genera archivo.
 */
export async function exportarReporte(formato: "pdf" | "excel", filtros: FiltrosReporte): Promise<ArchivoReporte> {
  const usuario = await exigirSesion();
  const resultado = await calcularReporte(usuario, filtros);
  if (!resultado.ok || !resultado.datos) return { ok: false, error: resultado.ok ? MENSAJE_SIN_RESULTADOS : resultado.error };

  const datos = await obtenerDatos();
  const categorias = await datos.listarCategorias(usuario.organizacionId);
  const contenidoDatos = {
    reporte: resultado.datos,
    generadoPor: usuario.nombre,
    fechaGeneracion: formatearFechaHora(new Date().toISOString()),
    filtros: [
      ["Categoría", categorias.find((c) => c.id === filtros.categoriaId)?.nombre ?? "Todas"],
      ["Estado de conservación", filtros.estado ? ETIQUETAS_ESTADO_CONSERVACION[filtros.estado as keyof typeof ETIQUETAS_ESTADO_CONSERVACION] ?? filtros.estado : "Todos"],
      ["Fecha de registro desde", filtros.desde ? formatearFecha(filtros.desde) : "Sin límite"],
      ["Fecha de registro hasta", filtros.hasta ? formatearFecha(filtros.hasta) : "Sin límite"],
    ] as [string, string][],
  };
  const base = `reporte_categoria_estado_${hoyISO()}`;
  if (formato === "pdf") {
    return { ok: true, nombreArchivo: `${base}.pdf`, tipoContenido: "application/pdf", contenido: await generarPdfReporte(contenidoDatos) };
  }
  return {
    ok: true,
    nombreArchivo: `${base}.xlsx`,
    tipoContenido: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contenido: await generarExcelReporte(contenidoDatos),
  };
}

/* ---- Reportes de piezas, exposiciones y préstamos ---- */

/** Valores válidos de cada filtro de lista. Un valor vacío significa que el filtro no se usa. */
const DISPONIBILIDADES_VALIDAS = DISPONIBILIDADES as readonly string[];
const ESTADOS_EXPOSICION_VALIDOS = Object.keys(ETIQUETAS_ESTADO_EXPOSICION);
const SITUACIONES_VALIDAS = Object.keys(ETIQUETAS_SITUACION_PRESTAMO);

/**
 * Validación común de los filtros, en el orden de los reportes: acceso al museo, valores permitidos y formato de las
 * fechas, y después el rango. Devuelve el mensaje de error o nada si los filtros son correctos.
 */
async function errorDeFiltrosComunes(
  datos: Datos,
  usuario: UsuarioPublico,
  filtros: { museoId?: string; desde?: string; hasta?: string },
  listas: { valor?: string; validos: readonly string[] }[],
): Promise<string | undefined> {
  if (filtros.museoId) {
    const museos = await museosVisibles(datos, usuario);
    if (!museos.some((m) => m.id === filtros.museoId)) return MENSAJE_SIN_ACCESO_MUSEO;
  }
  for (const l of listas) if (l.valor && !l.validos.includes(l.valor)) return MENSAJE_FILTRO_INVALIDO;
  for (const fecha of [filtros.desde, filtros.hasta]) if (fecha && !esFechaIso(fecha)) return MENSAJE_FECHA_FORMATO;
  return errorDeRangoFechas(filtros.desde, filtros.hasta);
}

/** Museos visibles de la persona, activos o no, para el selector de museo de los reportes. */
async function museosDelSelector(): Promise<{ museos: Museo[] }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return { museos: await museosVisibles(datos, usuario) };
}

/** Pares etiqueta y texto de los filtros para el encabezado de los archivos. */
function textoDeFecha(valor?: string): string {
  return valor ? formatearFecha(valor) : TEXTO_SIN_LIMITE;
}

async function nombreDelMuseo(datos: Datos, usuario: UsuarioPublico, museoId: string | undefined, todos: string): Promise<string> {
  if (!museoId) return todos;
  return (await museosVisibles(datos, usuario)).find((m) => m.id === museoId)?.nombre ?? todos;
}

function cabeceraArchivo(usuario: UsuarioPublico) {
  return { generadoPor: usuario.nombre, fechaGeneracion: formatearFechaHora(new Date().toISOString()) };
}

async function archivoDeTabla(formato: "pdf" | "excel", base: string, tabla: DatosTabla): Promise<ArchivoReporte> {
  const nombre = `${base}_${hoyISO()}`;
  if (formato === "pdf") {
    return { ok: true, nombreArchivo: `${nombre}.pdf`, tipoContenido: "application/pdf", contenido: await generarPdfTabla(tabla) };
  }
  return {
    ok: true,
    nombreArchivo: `${nombre}.xlsx`,
    tipoContenido: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contenido: await generarExcelTabla(tabla),
  };
}

/* Reporte de piezas */

export async function cargarReportePiezas(): Promise<{ museos: Museo[] }> {
  return museosDelSelector();
}

async function calcularReportePiezas(usuario: UsuarioPublico, filtros: FiltrosReportePiezas): Promise<Resultado<ReportePiezas>> {
  const datos = await obtenerDatos();
  const error = await errorDeFiltrosComunes(datos, usuario, filtros, [
    { valor: filtros.disponibilidad, validos: DISPONIBILIDADES_VALIDAS },
  ]);
  if (error) return { ok: false, error };

  const piezas = (await piezasVisibles(datos, usuario)).filter((p) => {
    const dia = diaLocal(p.fechaRegistro);
    return (
      (!filtros.museoId || p.museoId === filtros.museoId) &&
      (!filtros.disponibilidad || p.disponibilidad === filtros.disponibilidad) &&
      (!filtros.desde || dia >= filtros.desde) &&
      (!filtros.hasta || dia <= filtros.hasta)
    );
  });
  if (piezas.length === 0) return { ok: false, error: MENSAJE_SIN_RESULTADOS };

  const filas: FilaReportePiezas[] = piezas
    .sort((a, b) => a.museoNombre.localeCompare(b.museoNombre, "es") || compararCodigos(a.codigo, b.codigo))
    .map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      categoria: p.categoriaNombre,
      estadoConservacion: p.estadoConservacion,
      disponibilidad: p.disponibilidad,
      museo: p.museoNombre,
      ubicacion: p.ubicacionFisica,
      fechaRegistro: diaLocal(p.fechaRegistro),
    }));
  return { ok: true, datos: { filas, total: filas.length } };
}

export async function generarReportePiezas(filtros: FiltrosReportePiezas): Promise<Resultado<ReportePiezas>> {
  const usuario = await exigirSesion();
  return calcularReportePiezas(usuario, filtros);
}

export async function exportarReportePiezas(formato: "pdf" | "excel", filtros: FiltrosReportePiezas): Promise<ArchivoReporte> {
  const usuario = await exigirSesion();
  const resultado = await calcularReportePiezas(usuario, filtros);
  if (!resultado.ok || !resultado.datos) return { ok: false, error: resultado.ok ? MENSAJE_SIN_RESULTADOS : resultado.error };
  const datos = await obtenerDatos();
  const c = COLUMNAS_REPORTE_PIEZAS;
  const l = ETIQUETAS_FILTROS_REPORTE;
  return archivoDeTabla(formato, "reporte_piezas", {
    titulo: TITULO_REPORTE_PIEZAS,
    ...cabeceraArchivo(usuario),
    filtros: [
      [l.museo, await nombreDelMuseo(datos, usuario, filtros.museoId, TEXTO_TODOS)],
      [l.disponibilidad, filtros.disponibilidad ? ETIQUETAS_DISPONIBILIDAD[filtros.disponibilidad as keyof typeof ETIQUETAS_DISPONIBILIDAD] : TEXTO_TODAS],
      [l.desde, textoDeFecha(filtros.desde)],
      [l.hasta, textoDeFecha(filtros.hasta)],
    ],
    columnas: [
      { etiqueta: c.codigo, ancho: 1.1 },
      { etiqueta: c.nombre, ancho: 3 },
      { etiqueta: c.categoria, ancho: 1.5 },
      { etiqueta: c.estado, ancho: 1 },
      { etiqueta: c.disponibilidad, ancho: 1.6 },
      { etiqueta: c.museo, ancho: 2.4 },
      { etiqueta: c.ubicacion, ancho: 2.8 },
      { etiqueta: c.fechaRegistro, ancho: 1.2 },
    ],
    filas: resultado.datos.filas.map((f) => [
      f.codigo,
      f.nombre,
      f.categoria,
      ETIQUETAS_ESTADO_CONSERVACION[f.estadoConservacion],
      ETIQUETAS_DISPONIBILIDAD[f.disponibilidad],
      f.museo,
      f.ubicacion ?? "-",
      formatearFecha(f.fechaRegistro),
    ]),
    total: { etiqueta: TOTAL_PIEZAS, valor: resultado.datos.total },
    orientacion: "horizontal",
  });
}

/* Reporte de exposiciones */

export async function cargarReporteExposiciones(): Promise<{ museos: Museo[] }> {
  return museosDelSelector();
}

async function calcularReporteExposiciones(
  usuario: UsuarioPublico,
  filtros: FiltrosReporteExposiciones,
): Promise<Resultado<ReporteExposiciones>> {
  const datos = await obtenerDatos();
  const error = await errorDeFiltrosComunes(datos, usuario, filtros, [
    { valor: filtros.estado, validos: ESTADOS_EXPOSICION_VALIDOS },
  ]);
  if (error) return { ok: false, error };

  // El rango pedido incluye los dos extremos. Se pasa a un rango con fin exclusivo para usar el cruce de fechas del sistema.
  const rango = {
    inicio: filtros.desde ?? "0000-01-01",
    fin: filtros.hasta ? diaSiguiente(filtros.hasta) : "9999-12-31",
  };
  const exposiciones = (await exposicionesVisibles(datos, usuario)).filter(
    (e) =>
      (!filtros.museoId || e.museoId === filtros.museoId) &&
      (!filtros.estado || e.estado === filtros.estado) &&
      rangosSeCruzan(rangoExposicion(e), rango),
  );
  if (exposiciones.length === 0) return { ok: false, error: MENSAJE_SIN_RESULTADOS };

  const piezas = await piezasVisibles(datos, usuario);
  const filas: FilaReporteExposiciones[] = exposiciones
    .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      museo: e.museoNombre,
      estado: e.estado,
      fechaInicio: e.fechaInicio,
      fechaFin: e.fechaFin,
      cantidadPiezas: e.cantidadPiezas,
      piezas: e.piezaIds
        .map((id) => piezas.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ codigo: p.codigo, nombre: p.nombre })),
    }));
  return { ok: true, datos: { filas, total: filas.length } };
}

export async function generarReporteExposiciones(filtros: FiltrosReporteExposiciones): Promise<Resultado<ReporteExposiciones>> {
  const usuario = await exigirSesion();
  return calcularReporteExposiciones(usuario, filtros);
}

export async function exportarReporteExposiciones(
  formato: "pdf" | "excel",
  filtros: FiltrosReporteExposiciones,
): Promise<ArchivoReporte> {
  const usuario = await exigirSesion();
  const resultado = await calcularReporteExposiciones(usuario, filtros);
  if (!resultado.ok || !resultado.datos) return { ok: false, error: resultado.ok ? MENSAJE_SIN_RESULTADOS : resultado.error };
  const datos = await obtenerDatos();
  const c = COLUMNAS_REPORTE_EXPOSICIONES;
  const l = ETIQUETAS_FILTROS_REPORTE;
  return archivoDeTabla(formato, "reporte_exposiciones", {
    titulo: TITULO_REPORTE_EXPOSICIONES,
    ...cabeceraArchivo(usuario),
    filtros: [
      [l.museo, await nombreDelMuseo(datos, usuario, filtros.museoId, TEXTO_TODOS)],
      [l.estado, filtros.estado ? ETIQUETAS_ESTADO_EXPOSICION[filtros.estado as keyof typeof ETIQUETAS_ESTADO_EXPOSICION] : TEXTO_TODOS],
      [l.desde, textoDeFecha(filtros.desde)],
      [l.hasta, textoDeFecha(filtros.hasta)],
    ],
    columnas: [
      { etiqueta: c.nombre, ancho: 2.2 },
      { etiqueta: c.museo, ancho: 2.6 },
      { etiqueta: c.estado, ancho: 1.2 },
      { etiqueta: c.inicio, ancho: 1.2 },
      { etiqueta: c.fin, ancho: 1.2 },
      { etiqueta: c.cantidad, ancho: 0.8, alineacion: "centro" },
      { etiqueta: c.piezas, ancho: 5.2 },
    ],
    filas: resultado.datos.filas.map((f) => [
      f.nombre,
      f.museo,
      ETIQUETAS_ESTADO_EXPOSICION[f.estado],
      formatearFecha(f.fechaInicio),
      formatearFecha(f.fechaFin),
      f.cantidadPiezas,
      f.piezas.map((p) => `${p.codigo} ${p.nombre}`),
    ]),
    total: { etiqueta: TOTAL_EXPOSICIONES, valor: resultado.datos.total },
    orientacion: "horizontal",
  });
}

/* Reporte de préstamos */

export async function cargarReportePrestamos(): Promise<{ museos: Museo[] }> {
  return museosDelSelector();
}

async function calcularReportePrestamos(
  usuario: UsuarioPublico,
  filtros: FiltrosReportePrestamos,
): Promise<Resultado<ReportePrestamos>> {
  const datos = await obtenerDatos();
  const error = await errorDeFiltrosComunes(datos, usuario, filtros, [
    { valor: filtros.situacion, validos: SITUACIONES_VALIDAS },
  ]);
  if (error) return { ok: false, error };

  const prestamos = (await prestamosVisibles(datos, usuario)).filter(
    (p) =>
      (!filtros.museoId || p.museoId === filtros.museoId) &&
      (!filtros.situacion || p.situacion === filtros.situacion) &&
      coincideTexto(p.institucionDestino, filtros.institucion) &&
      (!filtros.desde || p.fechaSalida >= filtros.desde) &&
      (!filtros.hasta || p.fechaSalida <= filtros.hasta),
  );
  if (prestamos.length === 0) return { ok: false, error: MENSAJE_SIN_RESULTADOS };

  const filas: FilaReportePrestamos[] = prestamos
    .sort((a, b) => b.fechaSalida.localeCompare(a.fechaSalida))
    .map((p) => ({
      id: p.id,
      piezaCodigo: p.piezaCodigo,
      piezaNombre: p.piezaNombre,
      museo: p.museoNombre,
      institucionDestino: p.institucionDestino,
      responsableReceptor: p.responsableReceptor,
      numeroConvenio: p.numeroConvenio,
      numeroPoliza: p.numeroPoliza,
      valorAsegurado: p.valorAsegurado,
      fechaSalida: p.fechaSalida,
      fechaDevolucionPrevista: p.fechaDevolucionPrevista,
      fechaDevolucionReal: p.fechaDevolucionReal,
      situacion: p.situacion,
    }));
  return { ok: true, datos: { filas, total: filas.length } };
}

export async function generarReportePrestamos(filtros: FiltrosReportePrestamos): Promise<Resultado<ReportePrestamos>> {
  const usuario = await exigirSesion();
  return calcularReportePrestamos(usuario, filtros);
}

export async function exportarReportePrestamos(
  formato: "pdf" | "excel",
  filtros: FiltrosReportePrestamos,
): Promise<ArchivoReporte> {
  const usuario = await exigirSesion();
  const resultado = await calcularReportePrestamos(usuario, filtros);
  if (!resultado.ok || !resultado.datos) return { ok: false, error: resultado.ok ? MENSAJE_SIN_RESULTADOS : resultado.error };
  const datos = await obtenerDatos();
  const c = COLUMNAS_REPORTE_PRESTAMOS;
  const l = ETIQUETAS_FILTROS_REPORTE;
  return archivoDeTabla(formato, "reporte_prestamos", {
    titulo: TITULO_REPORTE_PRESTAMOS,
    ...cabeceraArchivo(usuario),
    filtros: [
      [l.museo, await nombreDelMuseo(datos, usuario, filtros.museoId, TEXTO_TODOS)],
      [l.situacion, filtros.situacion ? ETIQUETAS_SITUACION_PRESTAMO[filtros.situacion as keyof typeof ETIQUETAS_SITUACION_PRESTAMO] : TEXTO_TODAS],
      [l.institucion, filtros.institucion?.trim() || TEXTO_TODAS],
      [l.desde, textoDeFecha(filtros.desde)],
      [l.hasta, textoDeFecha(filtros.hasta)],
    ],
    columnas: [
      { etiqueta: c.pieza, ancho: 3 },
      { etiqueta: c.museo, ancho: 3 },
      { etiqueta: c.institucion, ancho: 2.1 },
      { etiqueta: c.responsable, ancho: 2.1 },
      { etiqueta: c.convenio, ancho: 1.5 },
      { etiqueta: c.poliza, ancho: 1.3 },
      { etiqueta: c.valor, ancho: 1.3 },
      { etiqueta: c.salida, ancho: 1.2 },
      { etiqueta: c.devolucionPrevista, ancho: 1.2 },
      { etiqueta: c.devolucionReal, ancho: 1.2 },
      { etiqueta: c.situacion, ancho: 1.2 },
    ],
    columnasMonto: [6],
    filas: resultado.datos.filas.map((f) => [
      `${f.piezaCodigo} ${f.piezaNombre}`,
      f.museo,
      f.institucionDestino,
      f.responsableReceptor,
      f.numeroConvenio,
      f.numeroPoliza,
      f.valorAsegurado,
      formatearFecha(f.fechaSalida),
      formatearFecha(f.fechaDevolucionPrevista),
      f.fechaDevolucionReal ? formatearFecha(f.fechaDevolucionReal) : "-",
      ETIQUETAS_SITUACION_PRESTAMO[f.situacion],
    ]),
    total: { etiqueta: TOTAL_PRESTAMOS, valor: resultado.datos.total },
    orientacion: "horizontal",
  });
}
