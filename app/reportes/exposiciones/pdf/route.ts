import { exportarReporteExposiciones } from "@/lib/controllers/CC_Reporte";
import { respuestaPdf } from "@/lib/exportacion/respuestaPdf";
import { parametrosAMapa } from "@/lib/reporteParametros";

const CLAVES = ["museoId", "estado", "desde", "hasta"] as const;

/** PDF del reporte de exposiciones, en el visor del navegador. Requiere sesión; recalcula con los filtros recibidos. */
export async function GET(solicitud: Request) {
  const filtros = parametrosAMapa(new URL(solicitud.url).searchParams, CLAVES);
  const archivo = await exportarReporteExposiciones("pdf", filtros);
  if (!archivo.ok) return new Response(archivo.error, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return respuestaPdf(archivo.contenido, archivo.nombreArchivo);
}
