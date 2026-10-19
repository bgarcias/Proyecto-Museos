"use server";

import { notFound } from "next/navigation";
import { exigirSesion } from "../auth/session";
import { obtenerDatos } from "../data";
import type { HistorialCambio, Pieza } from "../tipos";
import { puedeAccederAlMuseo } from "./acceso";

export type RegistroHistorial = HistorialCambio & { usuarioNombre: string };

/* ECUS04: Consultar Historial de Cambios de una Pieza */

export async function consultarHistorial(
  piezaId: string,
): Promise<{ pieza: Pieza; registros: RegistroHistorial[] }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const pieza = await datos.obtenerPieza(usuario.organizacionId, piezaId);
  if (!pieza || !(await puedeAccederAlMuseo(datos, usuario, pieza.museoId))) notFound();

  const [cambios, usuarios] = await Promise.all([
    datos.listarHistorialPieza(usuario.organizacionId, piezaId),
    datos.listarUsuarios(usuario.organizacionId),
  ]);
  const registros = cambios
    .map((c) => ({
      ...c,
      usuarioNombre: usuarios.find((u) => u.id === c.usuarioId)?.nombre ?? "Usuario desconocido",
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return { pieza, registros };
}
