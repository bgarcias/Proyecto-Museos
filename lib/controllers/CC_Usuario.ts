"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { borrarCuenta, crearCuenta, quitarIndicadorCambioContrasena } from "../auth/cuentas";
import {
  cerrarSesion,
  exigirAdministrador,
  exigirSesion,
  iniciarSesion,
  obtenerSesion,
} from "../auth/session";
import {
  obtenerCargaAdminEmail,
  obtenerCargaColaboradorEmail,
  obtenerCargaContrasena,
  obtenerMostrarDatosDemo,
} from "../config/env";
import { MENSAJE_CONTRASENA_DEBIL, ROLES } from "../constantes";
import { obtenerDatos } from "../data";
import { CUENTAS_DEMO, museosSoloAdministrador } from "../datosDemo";
import { crearClienteServidor } from "../supabase/servidor";
import type { DatosDemo, Museo, Resultado, ResultadoCampos, Rol, Usuario, UsuarioListado, UsuarioPublico } from "../tipos";
import {
  CONTRASENA_MAXIMO,
  CONTRASENA_MINIMO,
  errorDeContrasenaIngreso,
  errorDeCorreo,
  errorDeLongitudContrasena,
  esCorreoValido,
} from "../validaciones";
import { museosActivosVisibles, museosVisibles } from "./acceso";
import { protegida } from "./errores";

/** Sin caracteres ambiguos: faltan 0, O, 1, l e I. */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const LONGITUD_CONTRASENA_TEMPORAL = 10;

/** Diez caracteres con generador criptográficamente seguro. Cumple siempre el mínimo y el máximo compartidos. */
function generarContrasenaTemporal(): string {
  let r = "";
  if (LONGITUD_CONTRASENA_TEMPORAL < CONTRASENA_MINIMO || LONGITUD_CONTRASENA_TEMPORAL > CONTRASENA_MAXIMO) {
    throw new Error("La longitud de la contraseña temporal no cumple las reglas de contraseña");
  }
  for (let i = 0; i < LONGITUD_CONTRASENA_TEMPORAL; i++) r += ALFABETO[randomInt(ALFABETO.length)];
  return r;
}

/* Apoyo: inicio de sesión, cambio de contraseña e inicio */

/** Las pantallas públicas de acceso no se muestran a quien ya tiene sesión. */
async function redirigirSiHaySesion(): Promise<void> {
  const usuario = await obtenerSesion();
  if (usuario) redirect("/");
}

/** Antes de mostrar el inicio de sesión: quien ya tiene sesión pasa al inicio. Devuelve las cuentas de demostración solo si MOSTRAR_DATOS_DEMO es true. */
export async function cargarLogin(): Promise<DatosDemo | null> {
  await redirigirSiHaySesion();
  if (!obtenerMostrarDatosDemo()) return null;
  try {
    const admin = obtenerCargaAdminEmail();
    const colaborador = obtenerCargaColaboradorEmail();
    const contrasena = obtenerCargaContrasena();
    return {
      contrasena,
      cuentas: CUENTAS_DEMO.map((c) => ({
        clave: c.clave,
        nombre: c.nombre,
        rol: c.rol,
        correo: c.correo ?? (c.clave === "admin" ? admin : colaborador),
        museos: c.museos,
      })),
      soloAdministrador: museosSoloAdministrador(),
    };
  } catch {
    // Si faltan las variables de la carga, el recuadro simplemente no se muestra
    return null;
  }
}

export async function obtenerUsuarioActual(): Promise<UsuarioPublico | null> {
  return obtenerSesion();
}

export async function ingresar(
  correo: string,
  contrasena: string,
): Promise<ResultadoCampos<"correo" | "contrasena">> {
  return protegida("ingresar", () => ingresarInterno(correo, contrasena));
}

async function ingresarInterno(
  correo: string,
  contrasena: string,
): Promise<ResultadoCampos<"correo" | "contrasena">> {
  // Validación por campo. La contraseña solo debe no estar vacía.
  const errores: { correo?: string; contrasena?: string } = {};
  const errorCorreo = errorDeCorreo(correo);
  const errorContrasena = errorDeContrasenaIngreso(contrasena);
  if (errorCorreo) errores.correo = errorCorreo;
  if (errorContrasena) errores.contrasena = errorContrasena;
  if (errorCorreo || errorContrasena) return { ok: false, errores };

  const inicio = await iniciarSesion(correo.trim(), contrasena);
  if (!inicio.ok) {
    return {
      ok: false,
      error:
        inicio.motivo === "desactivada"
          ? "La cuenta se encuentra desactivada. Comuníquese con el administrador."
          : "Correo electrónico o contraseña incorrectos",
    };
  }
  redirect(inicio.usuario.debeCambiarContrasena ? "/cambiar-contrasena" : "/");
}

/* Recuperación de contraseña con Supabase Auth: el correo lleva un enlace a /restablecer-contrasena */

export async function cargarRecuperacion(): Promise<void> {
  await redirigirSiHaySesion();
}

export async function solicitarRecuperacion(correo: string): Promise<ResultadoCampos<"correo">> {
  return protegida("solicitarRecuperacion", () => solicitarRecuperacionInterno(correo));
}

async function solicitarRecuperacionInterno(correo: string): Promise<ResultadoCampos<"correo">> {
  const errorCorreo = errorDeCorreo(correo);
  if (errorCorreo) return { ok: false, errores: { correo: errorCorreo } };
  const solicitud = await headers();
  const servidor = solicitud.get("x-forwarded-host") ?? solicitud.get("host") ?? "";
  const protocolo = solicitud.get("x-forwarded-proto") ?? (servidor.startsWith("localhost") ? "http" : "https");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.resetPasswordForEmail(correo.trim(), {
    redirectTo: `${protocolo}://${servidor}/restablecer-contrasena`,
  });
  // Un límite de envíos no se muestra: el mensaje es el mismo exista o no el correo
  if (error && error.code !== "over_email_send_rate_limit") throw error;
  // Mensaje neutro: no revela si el correo existe
  return { ok: true, mensaje: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña" };
}

/** El enlace del correo deja una sesión de recuperación: sin ella no hay nada que restablecer. */
export async function cargarRestablecimiento(): Promise<void> {
  if (!(await obtenerSesion())) redirect("/login");
}

export async function definirNuevaContrasena(nueva: string, confirmacion: string): Promise<Resultado> {
  return protegida("definirNuevaContrasena", () => definirNuevaContrasenaInterno(nueva, confirmacion));
}

async function definirNuevaContrasenaInterno(nueva: string, confirmacion: string): Promise<Resultado> {
  const errorLongitud = errorDeLongitudContrasena(nueva);
  if (errorLongitud) return { ok: false, error: errorLongitud };
  if (nueva !== confirmacion) {
    return { ok: false, error: "Las contraseñas no coinciden" };
  }
  const usuario = await exigirSesion({ permitirCambioPendiente: true });
  const error = await cambiarContrasenaEnAuth(nueva);
  if (error) return { ok: false, error };
  await quitarIndicadorCambioContrasena(usuario.id);
  // La sesión de recuperación no se conserva: se vuelve a entrar con la contraseña nueva
  await cerrarSesion();
  redirect("/login");
}

/** Cambia la contraseña de la sesión actual en Auth. Devuelve el mensaje de error, o undefined si salió bien. */
async function cambiarContrasenaEnAuth(nueva: string): Promise<string | undefined> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (!error) return undefined;
  if (error.code === "same_password") return "La nueva contraseña debe ser distinta de la actual";
  if (error.code === "weak_password") return MENSAJE_CONTRASENA_DEBIL;
  throw error;
}

export async function cerrarSesionAccion(): Promise<void> {
  await cerrarSesion();
  redirect("/login");
}

export async function cargarCambioContrasena(): Promise<UsuarioPublico> {
  return exigirSesion({ permitirCambioPendiente: true });
}

export async function cambiarContrasena(nueva: string, confirmacion: string): Promise<Resultado> {
  return protegida("cambiarContrasena", () => cambiarContrasenaInterno(nueva, confirmacion));
}

async function cambiarContrasenaInterno(nueva: string, confirmacion: string): Promise<Resultado> {
  const usuario = await exigirSesion({ permitirCambioPendiente: true });
  const errorLongitud = errorDeLongitudContrasena(nueva);
  if (errorLongitud) return { ok: false, error: errorLongitud };
  if (nueva !== confirmacion) {
    return { ok: false, error: "Las contraseñas no coinciden" };
  }
  const error = await cambiarContrasenaEnAuth(nueva);
  if (error) return { ok: false, error };
  await quitarIndicadorCambioContrasena(usuario.id);
  // El indicador viaja en la sesión: se renueva para que la nueva ya no lo lleve
  const supabase = await crearClienteServidor();
  await supabase.auth.refreshSession();
  // El layout raíz decide si muestra el menú según debeCambiarContrasena: se invalida para que se reevalúe.
  revalidatePath("/", "layout");
  redirect("/");
}

export async function cargarInicio(): Promise<UsuarioPublico> {
  return exigirSesion();
}

/* ECUS01: Gestionar Usuarios del Museo */

export async function listarUsuarios(): Promise<UsuarioListado[]> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const [usuarios, museos] = await Promise.all([
    datos.listarUsuarios(sesion.organizacionId),
    datos.listarMuseos(sesion.organizacionId),
  ]);
  return usuarios
    .map((u) => ({
      ...u,
      museos: u.museoIds.map((id) => museos.find((m) => m.id === id)?.nombre ?? "").filter(Boolean),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/**
 * Formulario para registrar (sin id) o editar (con id). Ofrece los museos activos y, al editar, también los inactivos ya asignados.
 * Null si el usuario no existe en la organización.
 */
export async function cargarFormularioUsuario(
  id?: string,
): Promise<{ museos: Museo[]; usuario: Usuario | null; esCuentaPropia: boolean } | null> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  if (!id) return { museos: await museosActivosVisibles(datos, sesion), usuario: null, esCuentaPropia: false };

  const usuario = await datos.obtenerUsuario(sesion.organizacionId, id);
  if (!usuario) return null;
  const museos = (await museosVisibles(datos, sesion)).filter((m) => m.activo || usuario.museoIds.includes(m.id));
  return { museos, usuario, esCuentaPropia: usuario.id === sesion.id };
}

type EntradaUsuario = { nombre: string; email: string; rol: string; museoIds: string[] };

/** Validaciones comunes de registrar y editar. Devuelve el error o los datos limpios. */
function validarEntradaUsuario(
  entrada: EntradaUsuario,
): { error: string } | { nombre: string; email: string; rol: Rol } {
  const nombre = entrada.nombre.trim();
  const email = entrada.email.trim().toLowerCase();
  if (!nombre) return { error: "Ingresa el nombre" };
  if (!esCorreoValido(email)) return { error: "Ingresa un correo electrónico válido" };
  if (!(ROLES as readonly string[]).includes(entrada.rol)) return { error: "Selecciona un rol" };
  return { nombre, email, rol: entrada.rol as Rol };
}

export async function registrarUsuario(
  entrada: EntradaUsuario,
): Promise<Resultado<{ contrasenaTemporal: string }>> {
  return protegida("registrarUsuario", () => registrarUsuarioInterno(entrada));
}

async function registrarUsuarioInterno(
  entrada: EntradaUsuario,
): Promise<Resultado<{ contrasenaTemporal: string }>> {
  const sesion = await exigirAdministrador();
  const validada = validarEntradaUsuario(entrada);
  if ("error" in validada) return { ok: false, error: validada.error };

  const datos = await obtenerDatos();
  const museos = await museosActivosVisibles(datos, sesion);
  const museoIds = entrada.museoIds.filter((id) => museos.some((m) => m.id === id));
  if (museoIds.length === 0) return { ok: false, error: "Selecciona al menos un museo" };

  if (await datos.obtenerUsuarioPorEmail(validada.email)) {
    return { ok: false, error: "Este correo ya se encuentra registrado" };
  }

  // Primero la cuenta de Auth, con el indicador de cambio de contraseña activo, y luego la fila de usuario
  const contrasenaTemporal = generarContrasenaTemporal();
  const cuenta = await crearCuenta(validada.email, contrasenaTemporal, true);
  if (!cuenta.ok) return { ok: false, error: "Este correo ya se encuentra registrado" };
  try {
    await datos.crearUsuario(sesion.organizacionId, {
      id: cuenta.id,
      nombre: validada.nombre,
      email: validada.email,
      rol: validada.rol,
      activo: true,
      museoIds,
    });
  } catch (error) {
    // Si falla la fila no debe quedar una cuenta de Auth sin usuario
    await borrarCuenta(cuenta.id).catch((e: unknown) => console.error("No se pudo borrar la cuenta de Auth creada:", e));
    throw error;
  }
  revalidatePath("/usuarios");
  return { ok: true, mensaje: "Usuario registrado exitosamente", datos: { contrasenaTemporal } };
}

export async function actualizarUsuario(id: string, entrada: EntradaUsuario): Promise<Resultado> {
  return protegida("actualizarUsuario", () => actualizarUsuarioInterno(id, entrada));
}

async function actualizarUsuarioInterno(id: string, entrada: EntradaUsuario): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const usuario = await datos.obtenerUsuario(sesion.organizacionId, id);
  if (!usuario) {
    return { ok: false, error: "No se encontró el usuario" };
  }
  const validada = validarEntradaUsuario(entrada);
  if ("error" in validada) return { ok: false, error: validada.error };
  // Nadie puede quitarse a sí mismo el rol de administrador.
  if (id === sesion.id && validada.rol !== usuario.rol) {
    return { ok: false, error: "No puede cambiar su propio rol" };
  }

  // Solo museos activos, más los inactivos que ya tenía asignados.
  const museos = (await museosVisibles(datos, sesion)).filter((m) => m.activo || usuario.museoIds.includes(m.id));
  const museoIds = entrada.museoIds.filter((mid) => museos.some((m) => m.id === mid));
  if (museoIds.length === 0) return { ok: false, error: "Selecciona al menos un museo" };

  const otro = await datos.obtenerUsuarioPorEmail(validada.email);
  if (otro && otro.id !== id) return { ok: false, error: "Este correo ya se encuentra registrado" };

  await datos.actualizarUsuario(sesion.organizacionId, id, { nombre: validada.nombre, email: validada.email, rol: validada.rol, museoIds });
  revalidatePath("/usuarios");
  return { ok: true, mensaje: "Usuario actualizado exitosamente" };
}

/** Paso 1 del sub flujo Desactivar: verifica que el usuario exista y no sea la propia cuenta. */
async function verificarDesactivacion(id: string): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  if (id === sesion.id) return { ok: false, error: "No puede desactivar su propia cuenta" };
  const datos = await obtenerDatos();
  const usuario = await datos.obtenerUsuario(sesion.organizacionId, id);
  if (!usuario) {
    return { ok: false, error: "No se encontró el usuario" };
  }
  return { ok: true };
}

/** Se llama al elegir "Desactivar", antes de pedir la confirmación. */
export async function verificarDesactivacionUsuario(id: string): Promise<Resultado> {
  return protegida("verificarDesactivacionUsuario", () => verificarDesactivacionUsuarioInterno(id));
}

async function verificarDesactivacionUsuarioInterno(id: string): Promise<Resultado> {
  return verificarDesactivacion(id);
}

export async function desactivarUsuario(id: string): Promise<Resultado> {
  return protegida("desactivarUsuario", () => desactivarUsuarioInterno(id));
}

async function desactivarUsuarioInterno(id: string): Promise<Resultado> {
  const verificacion = await verificarDesactivacion(id);
  if (!verificacion.ok) return verificacion;
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  await datos.cambiarActivoUsuario(sesion.organizacionId, id, false);
  revalidatePath("/usuarios");
  return { ok: true, mensaje: "Usuario desactivado exitosamente" };
}

/** Extensión fuera del informe: reactiva una cuenta inactiva. Conserva sus museos y su historial. */
export async function activarUsuario(id: string): Promise<Resultado> {
  return protegida("activarUsuario", () => activarUsuarioInterno(id));
}

async function activarUsuarioInterno(id: string): Promise<Resultado> {
  const sesion = await exigirAdministrador();
  const datos = await obtenerDatos();
  const usuario = await datos.obtenerUsuario(sesion.organizacionId, id);
  if (!usuario) {
    return { ok: false, error: "No se encontró el usuario" };
  }
  await datos.cambiarActivoUsuario(sesion.organizacionId, id, true);
  revalidatePath("/usuarios");
  return { ok: true, mensaje: "Usuario activado exitosamente" };
}
