import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { obtenerSupabaseAnonKey, obtenerSupabaseUrl } from "../config/env";

/** Ruta a la que llega el enlace del correo de recuperación. */
const RUTA_RESTABLECER = "/restablecer-contrasena";

/**
 * Renueva la sesión de Auth en cada petición y la deja en las cookies, para que los componentes de servidor
 * la lean ya vigente. También canjea el código del enlace de recuperación por la sesión de recuperación.
 */
export async function actualizarSesion(solicitud: NextRequest): Promise<NextResponse> {
  let respuesta = NextResponse.next({ request: solicitud });
  let url: string;
  let clave: string;
  try {
    url = obtenerSupabaseUrl();
    clave = obtenerSupabaseAnonKey();
  } catch {
    // Sin las variables de Supabase no hay sesión que renovar: las pantallas avisarán de lo que falta
    return respuesta;
  }

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll: () => solicitud.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) solicitud.cookies.set(name, value);
        respuesta = NextResponse.next({ request: solicitud });
        for (const { name, value, options } of lista) respuesta.cookies.set(name, value, options);
      },
    },
  });

  const codigo = solicitud.nextUrl.searchParams.get("code");
  if (solicitud.nextUrl.pathname === RUTA_RESTABLECER && codigo) {
    // Si el código ya se usó o venció no queda sesión y la pantalla manda al inicio de sesión
    await supabase.auth.exchangeCodeForSession(codigo);
    const destino = solicitud.nextUrl.clone();
    destino.searchParams.delete("code");
    const redireccion = NextResponse.redirect(destino);
    for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
    redireccion.headers.set("Cache-Control", "private, no-store");
    return redireccion;
  }

  // No se quita: es lo que renueva la sesión que está por vencer
  await supabase.auth.getClaims();
  // Una red de distribución no debe servir la sesión renovada de una persona a otra
  respuesta.headers.set("Cache-Control", "private, no-store");
  return respuesta;
}
