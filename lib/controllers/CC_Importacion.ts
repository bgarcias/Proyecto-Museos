"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "../auth/session";
import { claveCodigoAnterior } from "../codigos";
import { obtenerDatos } from "../data";
import {
  MAXIMO_BYTES_ARCHIVO,
  NOMBRE_ARCHIVO_PLANTILLA,
  filasConfirmadasSonValidas,
  generarArchivoPlantilla,
  leerArchivoPiezas,
  validarFilasPiezas,
  type FilaImportacion,
  type VistaPreviaImportacion,
} from "../importacion/importacion";
import { MAXIMO_MEGABYTES_ARCHIVO } from "../importacion/limitesImportacion";
import type { Museo, Resultado, UsuarioPublico } from "../tipos";
import type { Datos } from "../data/contratos";
import { museosActivosVisibles } from "./acceso";
import { protegida } from "./errores";

/* ECUS04: Importar Piezas desde Excel */

const MENSAJE_FORMATO = "El archivo no tiene el formato de la plantilla";
const CAMPO_ALTA_IMPORTACION = "alta por importación";

export async function cargarImportacion(): Promise<{ museos: Museo[] }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return { museos: await museosActivosVisibles(datos, usuario) };
}

/** Plantilla descargable. La llama la ruta /piezas/importar/plantilla. */
export async function generarPlantilla(): Promise<{ nombreArchivo: string; contenido: Uint8Array }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const categorias = await datos.listarCategorias(usuario.organizacionId);
  return { nombreArchivo: NOMBRE_ARCHIVO_PLANTILLA, contenido: await generarArchivoPlantilla(categorias) };
}

/** El museo de destino debe ser uno de los museos activos asignados a la persona. */
async function museoDeDestino(datos: Datos, usuario: UsuarioPublico, museoId: string): Promise<Museo | null> {
  if (!museoId) return null;
  const museos = await museosActivosVisibles(datos, usuario);
  return museos.find((m) => m.id === museoId) ?? null;
}

async function codigosAnterioresDelMuseo(datos: Datos, organizacionId: string, museoId: string): Promise<Set<string>> {
  const piezas = await datos.listarPiezas(organizacionId);
  return new Set(
    piezas
      .filter((p) => p.museoId === museoId && p.codigoAnterior)
      .map((p) => claveCodigoAnterior(p.codigoAnterior as string)),
  );
}

/** Pasos 2 a 5: verifica el formato, valida cada fila y devuelve la vista previa. No registra nada. */
export async function validarArchivo(formulario: FormData): Promise<Resultado<VistaPreviaImportacion>> {
  return protegida("validarArchivo", () => validarArchivoInterno(formulario));
}

async function validarArchivoInterno(formulario: FormData): Promise<Resultado<VistaPreviaImportacion>> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();

  const museo = await museoDeDestino(datos, usuario, String(formulario.get("museoId") ?? ""));
  if (!museo) return { ok: false, error: "Selecciona el museo de destino" };

  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Selecciona el archivo Excel a importar" };
  }
  // Paso 3: el archivo debe tener el formato de la plantilla (.xlsx)
  if (!archivo.name.toLowerCase().endsWith(".xlsx")) return { ok: false, error: MENSAJE_FORMATO };
  if (archivo.size > MAXIMO_BYTES_ARCHIVO) return { ok: false, error: `El archivo supera el tamaño máximo de ${MAXIMO_MEGABYTES_ARCHIVO} MB` };

  const lectura = await leerArchivoPiezas(await archivo.arrayBuffer());
  if (!lectura.ok) {
    return {
      ok: false,
      error: lectura.motivo === "formato" ? MENSAJE_FORMATO : "El archivo supera el máximo de 500 filas",
    };
  }

  // Paso 4: validación fila por fila
  const categorias = await datos.listarCategorias(usuario.organizacionId);
  const vista = validarFilasPiezas(lectura.filas, categorias, await codigosAnterioresDelMuseo(datos, usuario.organizacionId, museo.id));
  return { ok: true, datos: vista };
}

/**
 * Pasos 7 a 9. El cliente devuelve las filas válidas, pero el servidor vuelve a validar todo
 * antes de insertar: nunca se confía en lo que envía el cliente.
 */
export async function importarPiezas(museoId: string, filas: FilaImportacion[]): Promise<Resultado<{ total: number }>> {
  return protegida("importarPiezas", () => importarPiezasInterno(museoId, filas));
}

async function importarPiezasInterno(museoId: string, filas: FilaImportacion[]): Promise<Resultado<{ total: number }>> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();

  const museo = await museoDeDestino(datos, usuario, museoId);
  if (!museo) return { ok: false, error: "Selecciona el museo de destino" };

  const categorias = await datos.listarCategorias(usuario.organizacionId);
  if (!filasConfirmadasSonValidas(filas, categorias, await codigosAnterioresDelMuseo(datos, usuario.organizacionId, museo.id))) {
    return { ok: false, error: "No hay piezas válidas para importar" };
  }

  const creadas = await datos.crearPiezas(usuario.organizacionId, 
    filas.map((f) => ({
      museoId: museo.id,
      categoriaId: f.categoriaId,
      codigoAnterior: f.codigoAnterior?.trim() || undefined,
      nombre: f.nombre.trim(),
      descripcion: f.descripcion?.trim() || undefined,
      anio: f.anio,
      material: f.material?.trim() || undefined,
      estadoConservacion: f.estadoConservacion,
      ubicacionFisica: f.ubicacionFisica?.trim() || undefined,
      imagenUrl: undefined,
    })),
  );
  // Los códigos los asignó la capa de datos en el orden de las filas.
  // Paso 8: el alta por importación queda en el historial de cada pieza
  for (const pieza of creadas) {
    await datos.registrarCambio(usuario.organizacionId, {
      piezaId: pieza.id,
      usuarioId: usuario.id,
      campoModificado: CAMPO_ALTA_IMPORTACION,
    });
  }
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Importación finalizada correctamente", datos: { total: creadas.length } };
}
