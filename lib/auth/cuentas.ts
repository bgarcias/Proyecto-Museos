import { crearClienteAdmin } from "../supabase/servidor";

/*
 * Cuentas de Supabase Auth con la API de administración (clave de servicio). Solo para el servidor.
 * El indicador de cambio de contraseña vive en app_metadata, que la persona no puede editar. El de user_metadata sí.
 */

/** Nombre del indicador "debe cambiar la contraseña" dentro de app_metadata. */
export const INDICADOR_CAMBIO_CONTRASENA = "debe_cambiar_contrasena";

/** Crea la cuenta con el correo ya confirmado, sin enviar correos. Devuelve su id, o el motivo si el correo ya existe. */
export async function crearCuenta(
  correo: string,
  contrasena: string,
  debeCambiarContrasena: boolean,
): Promise<{ ok: true; id: string } | { ok: false; motivo: "correo_repetido" }> {
  const { data, error } = await crearClienteAdmin().auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: true,
    app_metadata: { [INDICADOR_CAMBIO_CONTRASENA]: debeCambiarContrasena },
  });
  if (error) {
    if (error.code === "email_exists") return { ok: false, motivo: "correo_repetido" };
    throw error;
  }
  return { ok: true, id: data.user.id };
}

export async function borrarCuenta(id: string): Promise<void> {
  const { error } = await crearClienteAdmin().auth.admin.deleteUser(id);
  if (error) throw error;
}

/** Quita el indicador de cambio de contraseña pendiente. */
export async function quitarIndicadorCambioContrasena(id: string): Promise<void> {
  const { error } = await crearClienteAdmin().auth.admin.updateUserById(id, {
    app_metadata: { [INDICADOR_CAMBIO_CONTRASENA]: false },
  });
  if (error) throw error;
}
