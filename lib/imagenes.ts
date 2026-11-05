import { BUCKET_IMAGENES_PIEZAS } from "./constantes";
import { obtenerSupabaseUrlPublica } from "./config/env";

/**
 * Dirección con la que se muestra la imagen de una pieza, a partir de lo guardado en imagen_url.
 * - Vacío: undefined (sin imagen).
 * - Empieza con "data:" o "http": se devuelve tal cual (imágenes antiguas guardadas como data URL).
 * - Cualquier otro valor es un nombre de archivo del bucket público: se arma la dirección pública con la URL de Supabase.
 * Sin la URL de Supabase configurada no hay dirección posible y devuelve undefined.
 */
export function urlImagenPieza(valor?: string | null): string | undefined {
  if (!valor) return undefined;
  if (valor.startsWith("data:") || valor.startsWith("http")) return valor;
  const base = obtenerSupabaseUrlPublica()?.replace(/\/+$/, "");
  if (!base) return undefined;
  return `${base}/storage/v1/object/public/${BUCKET_IMAGENES_PIEZAS}/${encodeURIComponent(valor)}`;
}

/** True si el valor guardado es un nombre de archivo del bucket (no un data URL ni una dirección completa). */
export function esNombreDeArchivoDeImagen(valor?: string | null): valor is string {
  return Boolean(valor) && !(valor as string).startsWith("data:") && !(valor as string).startsWith("http");
}
