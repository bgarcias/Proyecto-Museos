"use client";

import { useState } from "react";
import { generarReportePrestamos } from "@/lib/controllers/CC_Reporte";
import {
  COLUMNAS_REPORTE_PRESTAMOS,
  ETIQUETAS_FILTROS_REPORTE,
  ETIQUETAS_SITUACION_PRESTAMO,
  TEXTO_TODAS,
  TEXTO_TODOS,
  TITULO_REPORTE_PRESTAMOS,
  TITULO_RESULTADOS_REPORTE_PRESTAMOS,
  TOTAL_PRESTAMOS,
} from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import { formatearMonto } from "@/lib/formatos";
import { mapaAParametros } from "@/lib/reporteParametros";
import type { FiltrosReportePrestamos, Museo, ReportePrestamos, SituacionPrestamo } from "@/lib/tipos";
import { alertaError } from "@/components/ui/alertas";
import BotonesReporte from "@/components/ui/BotonesReporte";
import { Campo, Entrada, Seleccion } from "@/components/ui/Campo";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import estilosFiltros from "@/components/ui/FiltrosReporte.module.css";
import Tabla from "@/components/ui/Tabla";
import tablaEstilos from "@/components/ui/TablaReporte.module.css";
import estilos from "./CI_Reporte_Prestamos.module.css";

const SITUACIONES = Object.keys(ETIQUETAS_SITUACION_PRESTAMO) as SituacionPrestamo[];

/** Reporte de préstamos: listado de préstamos y devoluciones, con filtros de museo, situación, institución y fecha de salida. */
export default function CI_Reporte_Prestamos({ museos }: { museos: Museo[] }) {
  const [filtros, setFiltros] = useState<FiltrosReportePrestamos>({});
  const [reporte, setReporte] = useState<ReportePrestamos | null>(null);
  // Filtros con los que se generó el reporte mostrado: las exportaciones usan estos, no los valores actuales de los campos.
  const [filtrosDelReporte, setFiltrosDelReporte] = useState<FiltrosReportePrestamos>({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof FiltrosReportePrestamos, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));

  /** Limpiar vacía los filtros y quita el reporte mostrado. */
  function limpiar() {
    setFiltros({});
    setReporte(null);
    setFiltrosDelReporte({});
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await generarReportePrestamos(filtros);
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
      <EncabezadoPagina etiqueta="Reportes" titulo={TITULO_REPORTE_PRESTAMOS} />
      <Celda titulo="Filtros">
        <form onSubmit={alEnviar} className={estilos.formulario} noValidate>
          <div className={estilosFiltros.filtros}>
            <div className={estilosFiltros.amplio}>
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
            <div className={estilosFiltros.corto}>
              <Campo etiqueta={l.situacion} htmlFor="situacion">
                <Seleccion id="situacion" value={filtros.situacion ?? ""} onChange={(e) => cambiar("situacion", e.target.value)}>
                  <option value="">{TEXTO_TODAS}</option>
                  {SITUACIONES.map((s) => (
                    <option key={s} value={s}>
                      {ETIQUETAS_SITUACION_PRESTAMO[s]}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            </div>
            <div className={estilosFiltros.amplio}>
              <Campo etiqueta={l.institucion} htmlFor="institucion">
                <Entrada id="institucion" value={filtros.institucion ?? ""} onChange={(e) => cambiar("institucion", e.target.value)} />
              </Campo>
            </div>
            <div className={estilosFiltros.corto}>
              <Campo etiqueta={l.desde} htmlFor="desde">
                <Entrada id="desde" type="date" value={filtros.desde ?? ""} onChange={(e) => cambiar("desde", e.target.value)} />
              </Campo>
            </div>
            <div className={estilosFiltros.corto}>
              <Campo etiqueta={l.hasta} htmlFor="hasta">
                <Entrada id="hasta" type="date" value={filtros.hasta ?? ""} onChange={(e) => cambiar("hasta", e.target.value)} />
              </Campo>
            </div>
          </div>
          <BotonesReporte
            enviando={enviando}
            onLimpiar={limpiar}
            hrefPdf={reporte ? `/reportes/prestamos/pdf?${parametros}` : undefined}
            hrefExcel={reporte ? `/reportes/prestamos/excel?${parametros}` : undefined}
          />
        </form>
      </Celda>

      {reporte && (
        <Celda titulo={TITULO_RESULTADOS_REPORTE_PRESTAMOS}>
          <TablaReportePrestamos reporte={reporte} />
        </Celda>
      )}
    </div>
  );
}

/** Tabla del reporte de préstamos. Códigos, convenios, pólizas y fechas en una sola línea; los textos largos, hasta dos líneas. */
export function TablaReportePrestamos({ reporte }: { reporte: ReportePrestamos }) {
  const c = COLUMNAS_REPORTE_PRESTAMOS;
  const t = tablaEstilos;
  return (
    <Tabla resumen={TITULO_RESULTADOS_REPORTE_PRESTAMOS} clase={`${t.tabla} ${estilos.compacta}`}>
      <thead>
        <tr>
          <th className={estilos.pieza}>{c.pieza}</th>
          <th className={estilos.museo}>{c.museo}</th>
          <th className={estilos.texto}>{c.institucion}</th>
          <th className={estilos.texto}>{c.responsable}</th>
          <th className={t.ajustada}>{c.convenio}</th>
          <th className={t.ajustada}>{c.poliza}</th>
          <th className={t.ajustada}>{c.valor}</th>
          <th className={t.ajustada}>{c.salida}</th>
          <th className={t.ajustada}>{c.devolucionPrevista}</th>
          <th className={t.ajustada}>{c.devolucionReal}</th>
          <th className={t.ajustada}>{c.situacion}</th>
        </tr>
      </thead>
      <tbody>
        {reporte.filas.map((f) => (
          <tr key={f.id}>
            <td>
              <span className={`${t.linea} ${t.debajo}`}>{f.piezaCodigo}</span>
              <span className={t.debajo}>{f.piezaNombre}</span>
            </td>
            <td>{f.museo}</td>
            <td>{f.institucionDestino}</td>
            <td>{f.responsableReceptor}</td>
            <td className={`${t.ajustada} ${t.linea}`}>{f.numeroConvenio}</td>
            <td className={`${t.ajustada} ${t.linea}`}>{f.numeroPoliza}</td>
            <td className={`${t.ajustada} ${t.linea}`}>
              {formatearMonto(f.valorAsegurado)}
            </td>
            <td className={`${t.ajustada} ${t.linea}`}>{formatearFecha(f.fechaSalida)}</td>
            <td className={`${t.ajustada} ${t.linea}`}>{formatearFecha(f.fechaDevolucionPrevista)}</td>
            <td className={`${t.ajustada} ${t.linea}`}>
              {f.fechaDevolucionReal ? formatearFecha(f.fechaDevolucionReal) : "-"}
            </td>
            <td className={t.ajustada}>
              <Insignia valor={ETIQUETAS_SITUACION_PRESTAMO[f.situacion]} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={11}>
            {TOTAL_PRESTAMOS}: {reporte.total}
          </td>
        </tr>
      </tfoot>
    </Tabla>
  );
}
