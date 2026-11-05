import { crearClienteAdmin } from "./supabase/servidor";
import { BUCKET_IMAGENES_PIEZAS } from "./constantes";

// Solo para el servidor: usa la clave de servicio. No importar desde componentes de cliente.

export const MAXIMO_IMAGEN_BYTES = 1024 * 1024;

export type ImagenDecodificada = { bytes: Buffer; extension: "png" | "jpg"; tipo: "image/png" | "image/jpeg" };

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Decodifica un data URL PNG o JPG. El tipo real se confirma por los primeros bytes. Null si no es válida o pasa de 1 MB. */
export function decodificarImagen(dataUrl: string): ImagenDecodificada | null {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!m) return null;
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > MAXIMO_IMAGEN_BYTES) return null;
  const esPng = bytes.length > FIRMA_PNG.length && bytes.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG);
  const esJpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (m[1] === "png" ? !esPng : !esJpg) return null;
  return esPng ? { bytes, extension: "png", tipo: "image/png" } : { bytes, extension: "jpg", tipo: "image/jpeg" };
}

/** Nombre del archivo en el bucket. La marca de tiempo evita que el navegador muestre la imagen anterior desde su caché. */
export function nombreArchivoImagen(codigo: string, extension: string): string {
  const seguro = codigo.replace(/[^A-Za-z0-9_-]/g, "_");
  return `${seguro}-${Date.now()}.${extension}`;
}

/** Sube la imagen al bucket. Devuelve true si quedó guardada. */
export async function subirImagenPieza(nombre: string, imagen: ImagenDecodificada): Promise<boolean> {
  try {
    const { error } = await crearClienteAdmin().storage.from(BUCKET_IMAGENES_PIEZAS).upload(nombre, imagen.bytes, { contentType: imagen.tipo });
    if (error) console.error("subirImagenPieza", error.message);
    return !error;
  } catch (error) {
    console.error("subirImagenPieza", error);
    return false;
  }
}

/** Mueve un archivo dentro del bucket. Devuelve true si se movió. */
export async function moverImagenPieza(origen: string, destino: string): Promise<boolean> {
  try {
    const { error } = await crearClienteAdmin().storage.from(BUCKET_IMAGENES_PIEZAS).move(origen, destino);
    if (error) console.error("moverImagenPieza", error.message);
    return !error;
  } catch (error) {
    console.error("moverImagenPieza", error);
    return false;
  }
}

/** Borra un archivo del bucket. Si falla solo queda en el registro: un archivo sobrante no afecta a la pieza. */
export async function borrarImagenPieza(nombre: string): Promise<void> {
  try {
    const { error } = await crearClienteAdmin().storage.from(BUCKET_IMAGENES_PIEZAS).remove([nombre]);
    if (error) console.error("borrarImagenPieza", error.message);
  } catch (error) {
    console.error("borrarImagenPieza", error);
  }
}
