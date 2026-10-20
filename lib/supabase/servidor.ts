import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { obtenerSupabaseAnonKey, obtenerSupabaseServiceRoleKey, obtenerSupabaseUrl } from "../config/env";

// Solo para el servidor: no importar desde componentes de cliente.

/** Cliente de Auth con la sesión de las cookies. Usa la clave publicable, nunca la de servicio. */
export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient(obtenerSupabaseUrl(), obtenerSupabaseAnonKey(), {
    cookies: {
      getAll: () => almacen.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) almacen.set(name, value, options);
        } catch {
          // Desde un componente de servidor las cookies no se pueden escribir: el proxy renueva la sesión
        }
      },
    },
  });
}

/** Cliente con la clave de servicio, para la API de administración de Auth. Sin sesión ni renovación. */
export function crearClienteAdmin() {
  return createClient(obtenerSupabaseUrl(), obtenerSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
