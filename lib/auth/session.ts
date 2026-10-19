import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerDatos } from "../data";
import type { UsuarioPublico } from "../tipos";

/**
 * Toda la lógica de sesión vive aquí y nadie más toca la cookie.
 * Hoy la sesión es una cookie httpOnly con el id del usuario.
 * Al conectar Supabase Auth se reemplaza esta implementación manteniendo las mismas funciones.
 */

const COOKIE = "sesion_demo";

function aPublico(usuario: UsuarioPublico & { contrasena?: string }): UsuarioPublico {
  const { contrasena: _contrasena, ...publico } = usuario;
  return publico;
}

/** Devuelve el usuario de la sesión, o null si no hay sesión. */
export async function obtenerSesion(): Promise<UsuarioPublico | null> {
  const almacen = await cookies();
  const valor = almacen.get(COOKIE)?.value;
  if (!valor) return null;
  const datos = await obtenerDatos();
  const usuario = await datos.obtenerUsuario(valor);
  // Una cuenta desactivada no tiene sesión: su siguiente petición queda sin sesión y vuelve al login.
  return usuario && usuario.activo ? aPublico(usuario) : null;
}

export async function iniciarSesion(usuarioId: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(COOKIE, usuarioId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE);
}

/**
 * Exige sesión iniciada. Si la cuenta tiene contraseña temporal, solo permite
 * la pantalla de cambio de contraseña (opción permitirCambioPendiente).
 */
export async function exigirSesion(opciones?: { permitirCambioPendiente?: boolean }): Promise<UsuarioPublico> {
  const usuario = await obtenerSesion();
  if (!usuario) redirect("/login");
  if (usuario.debeCambiarContrasena && !opciones?.permitirCambioPendiente) {
    redirect("/cambiar-contrasena");
  }
  return usuario;
}

/** Exige sesión de administrador. Un colaborador vuelve al inicio. */
export async function exigirAdministrador(): Promise<UsuarioPublico> {
  const usuario = await exigirSesion();
  if (usuario.rol !== "administrador") redirect("/");
  return usuario;
}
