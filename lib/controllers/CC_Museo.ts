"use server";

import { revalidatePath } from "next/cache";
import { exigirAdministrador } from "../auth/session";
import { MENSAJE_MUSEO_NOMBRE_SIN_CARACTERES, nombreTienePrefijo } from "../codigos";
import { TIPOS_COLECCION } from "../constantes";
import { obtenerDatos } from "../data";
import type { Museo, Resultado, TipoColeccion, UsuarioPublico } from "../tipos";
import type { Datos } from "../data/contratos";
import { museosVisibles } from "./acceso";

/* Gestionar Museos (sin ECU en el informe). Solo el administrador. */

type EntradaMuseo = { nombre: string; tipo: string; direccion: string };

export async function listarMuseos(): Promise<Museo[]> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const museos = await museosVisibles(datos, sesion);
  return museos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Datos del formulario de museo. Sin id es un museo nuevo (null). Con id, null si no existe en la organización. */
export async function cargarFormularioMuseo(id?: string): Promise<{ museo: Museo | null } | null> {
  const sesion = await exigirAdministrador();
  if (!id) return { museo: null };
  const datos = await obtenerDatos();
  const museo = await datos.obtenerMuseo(sesion.organizacionId, id);
  if (!museo) return null;
  return { museo };
}

async function validarEntrada(
  datos: Datos,
  sesion: UsuarioPublico,
  entrada: EntradaMuseo,
  idActual?: string,
): Promise<{ error: string } | { nombre: string; tipo: TipoColeccion; direccion?: string }> {
  const nombre = entrada.nombre.trim();
  if (!nombre) return { error: "Ingresa el nombre del museo" };
  // El prefijo se saca del nombre: sin ninguna letra ni cifra no se podría calcular
  if (!nombreTienePrefijo(nombre)) return { error: MENSAJE_MUSEO_NOMBRE_SIN_CARACTERES };
  if (!(TIPOS_COLECCION as readonly string[]).includes(entrada.tipo)) return { error: "Selecciona el tipo de museo" };

  // El nombre es único dentro de la organización
  const museos = await datos.listarMuseos(sesion.organizacionId);
  if (museos.some((m) => m.id !== idActual && m.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
    return { error: "Ya existe un museo con ese nombre" };
  }
  return { nombre, tipo: entrada.tipo as TipoColeccion, direccion: entrada.direccion.trim() || undefined };
}

export async function registrarMuseo(entrada: EntradaMuseo): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const validada = await validarEntrada(datos, sesion, entrada);
  if ("error" in validada) return { ok: false, error: validada.error };
  await datos.crearMuseo(sesion.organizacionId, validada);
  revalidatePath("/museos");
  return { ok: true, mensaje: "Museo registrado exitosamente" };
}

export async function actualizarMuseo(id: string, entrada: EntradaMuseo): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const museo = await datos.obtenerMuseo(sesion.organizacionId, id);
  if (!museo) {
    return { ok: false, error: "No se encontró el museo" };
  }
  const validada = await validarEntrada(datos, sesion, entrada, id);
  if ("error" in validada) return { ok: false, error: validada.error };
  await datos.actualizarMuseo(sesion.organizacionId, id, validada);
  revalidatePath("/museos");
  return { ok: true, mensaje: "Museo actualizado exitosamente" };
}

async function cambiarEstado(id: string, activo: boolean): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const museo = await datos.obtenerMuseo(sesion.organizacionId, id);
  if (!museo) {
    return { ok: false, error: "No se encontró el museo" };
  }
  // No se borra nada: un museo inactivo deja de ofrecerse en los formularios nuevos,
  // pero sus piezas y exposiciones siguen visibles.
  await datos.cambiarActivoMuseo(sesion.organizacionId, id, activo);
  revalidatePath("/museos");
  return { ok: true, mensaje: activo ? "Museo activado exitosamente" : "Museo desactivado exitosamente" };
}

export async function desactivarMuseo(id: string): Promise<Resultado> {
  return cambiarEstado(id, false);
}

export async function activarMuseo(id: string): Promise<Resultado> {
  return cambiarEstado(id, true);
}
