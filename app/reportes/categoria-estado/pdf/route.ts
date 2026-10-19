import { exportarReporte } from "@/lib/controllers/CC_Reporte";
import { respuestaPdf } from "@/lib/respuestaPdf";
import { parametrosAFiltros } from "@/lib/reporteParametros";

/** Reporte por categoría y estado en PDF, en el visor del navegador. Requiere sesión y recalcula el reporte con los filtros recibidos. */
export async function GET(solicitud: Request) {
  const filtros = parametrosAFiltros(new URL(solicitud.url).searchParams);
  const archivo = await exportarReporte("pdf", filtros);
  if (!archivo.ok) return new Response(archivo.error, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return respuestaPdf(archivo.contenido, archivo.nombreArchivo);
}
