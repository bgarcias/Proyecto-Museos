import Link from "next/link";
import { EncabezadoPagina } from "@/components/ui/Celda";
import { ETIQUETA_PROXIMAMENTE } from "@/lib/constantes";
import { REPORTES } from "@/lib/navegacion";
import estilos from "./CI_Menu_Reportes.module.css";

/** Menú de reportes: una tarjeta por reporte. Los que aún no están conectados no son enlaces y muestran "Próximamente". */
export default function CI_Menu_Reportes() {
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Informes" titulo="Reportes" />
      <div className={estilos.tarjetas}>
        {REPORTES.map((r) =>
          r.disponible ? (
            <Link key={r.id} href={r.ruta} className={`${estilos.tarjeta} ${estilos.activa}`}>
              <span className={estilos.titulo}>{r.titulo}</span>
              <span>{r.detalle}</span>
            </Link>
          ) : (
            <div key={r.id} className={`${estilos.tarjeta} ${estilos.proxima}`} aria-disabled="true">
              <span className={estilos.titulo}>{r.titulo}</span>
              <span>{r.detalle}</span>
              <span className={estilos.etiqueta}>{ETIQUETA_PROXIMAMENTE}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
