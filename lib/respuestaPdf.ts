/**
 * Respuesta de cualquier PDF del sistema: se muestra en el visor del navegador (Content-Disposition inline) y el
 * botón de descarga del visor conserva el nombre del archivo.
 */
export function respuestaPdf(contenido: Uint8Array, nombreArchivo: string): Response {
  return new Response(contenido as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombreArchivo}"`,
    },
  });
}
