/**
 * Lectura central de las variables de entorno. Es el único archivo que lee process.env.
 * Cada variable falla con un mensaje claro solo cuando se usa la función que la necesita.
 */

function requerir(nombre: string, para: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}, necesaria ${para}. Complétala en .env.local (ver docs/CONEXION.md).`,
    );
  }
  return valor;
}

export function obtenerDataSource(): "memoria" | "prisma" {
  return process.env.DATA_SOURCE === "prisma" ? "prisma" : "memoria";
}

export function obtenerDatabaseUrl(): string {
  return requerir("DATABASE_URL", "para conectar la aplicación a la base de datos");
}

export function obtenerDirectUrl(): string {
  return requerir("DIRECT_URL", "para ejecutar las migraciones");
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
