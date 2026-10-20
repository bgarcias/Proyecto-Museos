import type { NextRequest } from "next/server";
import { actualizarSesion } from "./lib/supabase/proxy";

/** En Next 16 el proxy sustituye al middleware: renueva la sesión de Supabase Auth en cada petición. */
export async function proxy(solicitud: NextRequest) {
  return actualizarSesion(solicitud);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
