import { exportarReportePiezas } from "@/lib/controllers/CC_Reporte";
import { parametrosAMapa } from "@/lib/reporteParametros";

const CLAVES = ["museoId", "disponibilidad", "desde", "hasta"] as const;

/** Excel del reporte de piezas, como descarga. Requiere sesión; recalcula con los filtros recibidos. */
export async function GET(solicitud: Request) {
  const filtros = parametrosAMapa(new URL(solicitud.url).searchParams, CLAVES);
  const archivo = await exportarReportePiezas("excel", filtros);
  if (!archivo.ok) return new Response(archivo.error, { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(archivo.contenido as BodyInit, {
    headers: {
      "Content-Type": archivo.tipoContenido,
      "Content-Disposition": `attachment; filename="${archivo.nombreArchivo}"`,
    },
  });
}
