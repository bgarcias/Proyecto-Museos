"use client";

import { useState } from "react";
import { generarReportePiezas } from "@/lib/controllers/CC_Reporte";
import {
  COLUMNAS_REPORTE_PIEZAS,
  DISPONIBILIDADES,
  ETIQUETAS_DISPONIBILIDAD,
  ETIQUETAS_ESTADO_CONSERVACION,
  ETIQUETAS_FILTROS_REPORTE,
  TEXTO_TODAS,
  TEXTO_TODOS,
  TITULO_REPORTE_PIEZAS,
  TITULO_RESULTADOS_REPORTE_PIEZAS,
  TOTAL_PIEZAS,
} from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import { mapaAParametros } from "@/lib/reporteParametros";
import type { FiltrosReportePiezas, Museo, ReportePiezas } from "@/lib/tipos";
import { alertaError } from "@/components/ui/alertas";
import BotonesReporte from "@/components/ui/BotonesReporte";
import { Campo, Entrada, Seleccion } from "@/components/ui/Campo";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import estilosFiltros from "@/components/ui/FiltrosReporte.module.css";
import Tabla from "@/components/ui/Tabla";
import tablaEstilos from "@/components/ui/TablaReporte.module.css";
import estilos from "./CI_Reporte_Piezas.module.css";

/** Reporte de piezas: listado por museo, con filtros de museo, disponibilidad y fecha de registro. */
export default function CI_Reporte_Piezas({ museos }: { museos: Museo[] }) {
  const [filtros, setFiltros] = useState<FiltrosReportePiezas>({});
  const [reporte, setReporte] = useState<ReportePiezas | null>(null);
  // Filtros con los que se generó el reporte mostrado: las exportaciones usan estos, no los campos actuales.
  const [filtrosDelReporte, setFiltrosDelReporte] = useState<FiltrosReportePiezas>({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof FiltrosReportePiezas, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));

  /** Limpiar vacía los filtros y quita el reporte mostrado. */
  function limpiar() {
    setFiltros({});
    setReporte(null);
    setFiltrosDelReporte({});
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await generarReportePiezas(filtros);
    if (resultado.ok) {
      setReporte(resultado.datos ?? null);
      setFiltrosDelReporte(filtros);
    } else {
      setReporte(null);
      alertaError(resultado.error);
    }
    setEnviando(false);
  }

  const parametros = mapaAParametros(filtrosDelReporte);
  const l = ETIQUETAS_FILTROS_REPORTE;

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Reportes" titulo={TITULO_REPORTE_PIEZAS} />
      <Celda titulo="Filtros">
        <form onSubmit={alEnviar} className={estilos.formulario} noValidate>
          <div className={estilosFiltros.filtros}>
            <div className={estilos.filtroMuseo}>
              <Campo etiqueta={l.museo} htmlFor="museo">
                <Seleccion id="museo" value={filtros.museoId ?? ""} onChange={(e) => cambiar("museoId", e.target.value)}>
                  <option value="">{TEXTO_TODOS}</option>
                  {museos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>
            <div className={estilos.filtroDisponibilidad}>
              <Campo etiqueta={l.disponibilidad} htmlFor="disponibilidad">
                <Seleccion
                  id="disponibilidad"
                  value={filtros.disponibilidad ?? ""}
                  onChange={(e) => cambiar("disponibilidad", e.target.value)}
                >
                  <option value="">{TEXTO_TODAS}</option>
                  {DISPONIBILIDADES.map((d) => (
                    <option key={d} value={d}>
                      {ETIQUETAS_DISPONIBILIDAD[d]}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>
            <div className={estilos.filtroFecha}>
              <Campo etiqueta={l.desde} htmlFor="desde">
                <Entrada id="desde" type="date" value={filtros.desde ?? ""} onChange={(e) => cambiar("desde", e.target.value)} />
              </Campo>
            </div>
            <div className={estilos.filtroFecha}>
              <Campo etiqueta={l.hasta} htmlFor="hasta">
                <Entrada id="hasta" type="date" value={filtros.hasta ?? ""} onChange={(e) => cambiar("hasta", e.target.value)} />
              </Campo>
            </div>
          </div>
          <BotonesReporte
            enviando={enviando}
            onLimpiar={limpiar}
            hrefPdf={reporte ? `/reportes/piezas/pdf?${parametros}` : undefined}
            hrefExcel={reporte ? `/reportes/piezas/excel?${parametros}` : undefined}
          />
        </form>
      </Celda>

      {reporte && (
        <Celda titulo={TITULO_RESULTADOS_REPORTE_PIEZAS}>
          <TablaReportePiezas reporte={reporte} />
        </Celda>
      )}
    </div>
  );
}

/** Tabla del reporte de piezas. Código y fecha en una sola línea, nombre y ubicación con más ancho. */
export function TablaReportePiezas({ reporte }: { reporte: ReportePiezas }) {
  const c = COLUMNAS_REPORTE_PIEZAS;
  const t = tablaEstilos;
  return (
    <Tabla resumen={TITULO_RESULTADOS_REPORTE_PIEZAS} clase={t.tabla}>
      <thead>
        <tr>
          <th className={t.ajustada}>{c.codigo}</th>
          <th className={estilos.nombre}>{c.nombre}</th>
          <th>{c.categoria}</th>
          <th className={t.ajustada}>{c.estado}</th>
          <th className={t.ajustada}>{c.disponibilidad}</th>
          <th className={estilos.museo}>{c.museo}</th>
          <th className={estilos.ubicacion}>{c.ubicacion}</th>
          <th className={t.ajustada}>{c.fechaRegistro}</th>
        </tr>
      </thead>
      <tbody>
        {reporte.filas.map((f) => (
          <tr key={f.id}>
            <td className={`${t.ajustada} ${t.linea}`}>{f.codigo}</td>
            <td>{f.nombre}</td>
            <td>{f.categoria}</td>
            <td className={t.ajustada}>
              <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[f.estadoConservacion]} />
            </td>
            <td className={t.ajustada}>
              <Insignia valor={ETIQUETAS_DISPONIBILIDAD[f.disponibilidad]} />
            </td>
            <td>{f.museo}</td>
            <td>{f.ubicacion ?? "-"}</td>
            <td className={`${t.ajustada} ${t.linea}`}>{formatearFecha(f.fechaRegistro)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={8}>
            {TOTAL_PIEZAS}: {reporte.total}
          </td>
        </tr>
      </tfoot>
    </Tabla>
  );
}
