import { cache } from "react";
import { redirect } from "next/navigation";
import { obtenerDatos } from "../data";
import { crearClienteServidor } from "../supabase/servidor";
import type { UsuarioPublico } from "../tipos";
import { INDICADOR_CAMBIO_CONTRASENA } from "./cuentas";

/**
 * Toda la lógica de sesión vive aquí. La sesión es la de Supabase Auth, en cookies que renueva el proxy.
 * La fila de usuario se busca por el id de la cuenta de Auth: de ahí salen la organización, el rol y los museos.
 */

function aPublico(usuario: UsuarioPublico & { contrasena?: string }, debeCambiarContrasena: boolean): UsuarioPublico {
  const { contrasena: _contrasena, ...publico } = usuario;
  return { ...publico, debeCambiarContrasena };
}

/**
 * Usuario de la sesión, o null si no hay sesión. Se calcula una sola vez por petición.
 * Cuenta desactivada: queda sin sesión en su siguiente petición, aunque Auth la reconozca, y vuelve al login.
 */
export const obtenerSesion = cache(async (): Promise<UsuarioPublico | null> => {
  const supabase = await crearClienteServidor();
  // getClaims valida la firma de la sesión sin guardarla de nuevo; getSession en el servidor no la valida
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  const datos = await obtenerDatos();
  const usuario = await datos.obtenerUsuarioPorId(claims.sub);
  if (!usuario || !usuario.activo) return null;
  return aPublico(usuario, claims.app_metadata?.[INDICADOR_CAMBIO_CONTRASENA] === true);
});

/**
 * Inicia sesión con el correo y la contraseña. Una cuenta de Auth sin fila de usuario cuenta como credenciales
 * incorrectas, y una desactivada no entra aunque la contraseña sea correcta.
 */
export async function iniciarSesion(
  correo: string,
  contrasena: string,
): Promise<{ ok: true; usuario: UsuarioPublico } | { ok: false; motivo: "credenciales" | "desactivada" }> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) {
    if (error.code === "invalid_credentials") return { ok: false, motivo: "credenciales" };
    throw error;
  }
  const datos = await obtenerDatos();
  const usuario = await datos.obtenerUsuarioPorId(data.user.id);
  if (!usuario) {
    await supabase.auth.signOut();
    return { ok: false, motivo: "credenciales" };
  }
  if (!usuario.activo) {
    await supabase.auth.signOut();
    return { ok: false, motivo: "desactivada" };
  }
  return { ok: true, usuario: aPublico(usuario, data.user.app_metadata?.[INDICADOR_CAMBIO_CONTRASENA] === true) };
}

export async function cerrarSesion(): Promise<void> {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
}

/** Exige sesión. Con contraseña temporal solo deja entrar a cambiarla (permitirCambioPendiente). */
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
