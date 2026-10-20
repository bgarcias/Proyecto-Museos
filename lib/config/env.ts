/**
 * Único archivo que lee process.env. Cada variable falla con un mensaje claro
 * solo cuando se usa la función que la necesita.
 */

function requerir(nombre: string, para: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}, necesaria ${para}. Complétala en .env.local (ver .env.example).`,
    );
  }
  return valor;
}

/** Muestra el recuadro de cuentas de demostración en el inicio de sesión. Solo con el valor true. */
export function obtenerMostrarDatosDemo(): boolean {
  return process.env.MOSTRAR_DATOS_DEMO === "true";
}

export function obtenerDatabaseUrl(): string {
  return requerir("DATABASE_URL", "para conectar la aplicación a la base de datos");
}

export function obtenerSupabaseUrl(): string {
  return requerir("NEXT_PUBLIC_SUPABASE_URL", "para conectar con Supabase");
}

export function obtenerSupabaseAnonKey(): string {
  return requerir("NEXT_PUBLIC_SUPABASE_ANON_KEY", "para conectar con Supabase");
}

export function obtenerSupabaseServiceRoleKey(): string {
  return requerir("SUPABASE_SERVICE_ROLE_KEY", "para crear usuarios y subir imágenes desde el servidor");
}

/* Solo para la carga inicial de datos (npm run db:cargar) */

export function obtenerCargaAdminEmail(): string {
  return requerir("CARGA_ADMIN_EMAIL", "para la cuenta del administrador de la carga inicial");
}

export function obtenerCargaColaboradorEmail(): string {
  return requerir("CARGA_COLABORADOR_EMAIL", "para la cuenta del colaborador de la carga inicial");
}

export function obtenerCargaContrasena(): string {
  return requerir("CARGA_CONTRASENA", "para la contraseña de las cuentas de la carga inicial");
}
