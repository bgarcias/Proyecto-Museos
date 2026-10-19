import { exportarReporte } from "@/lib/controllers/CC_Reporte";
import { parametrosAFiltros } from "@/lib/reporteParametros";

/** Excel del reporte por categoría y estado, como descarga. Requiere sesión; recalcula con los filtros recibidos. */
export async function GET(solicitud: Request) {
  const filtros = parametrosAFiltros(new URL(solicitud.url).searchParams);
  const archivo = await exportarReporte("excel", filtros);
  if (!archivo.ok) return new Response(archivo.error, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(archivo.contenido as BodyInit, {
    headers: {
      "Content-Type": archivo.tipoContenido,
      "Content-Disposition": `attachment; filename="${archivo.nombreArchivo}"`,
    },
  });
}
