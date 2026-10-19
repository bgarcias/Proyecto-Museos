"use client";

import { useState } from "react";
import { generarReporteExposiciones } from "@/lib/controllers/CC_Reporte";
import {
  COLUMNAS_REPORTE_EXPOSICIONES,
  ETIQUETAS_ESTADO_EXPOSICION,
  ETIQUETAS_FILTROS_REPORTE,
  TEXTO_TODOS,
  TITULO_REPORTE_EXPOSICIONES,
  TITULO_RESULTADOS_REPORTE_EXPOSICIONES,
  TOTAL_EXPOSICIONES,
  VIGENCIAS,
} from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import { mapaAParametros } from "@/lib/reporteParametros";
import type { FiltrosReporteExposiciones, Museo, ReporteExposiciones } from "@/lib/tipos";
import { alertaError } from "@/components/ui/alertas";
import BotonesReporte from "@/components/ui/BotonesReporte";
import { Campo, Entrada, Seleccion } from "@/components/ui/Campo";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import estilosFiltros from "@/components/ui/FiltrosReporte.module.css";
import Tabla from "@/components/ui/Tabla";
import tablaEstilos from "@/components/ui/TablaReporte.module.css";
import estilos from "./CI_Reporte_Exposiciones.module.css";

/** Reporte de exposiciones: listado con sus piezas, con filtros de museo, estado y rango de fechas. */
export default function CI_Reporte_Exposiciones({ museos }: { museos: Museo[] }) {
  const [filtros, setFiltros] = useState<FiltrosReporteExposiciones>({});
  const [reporte, setReporte] = useState<ReporteExposiciones | null>(null);
  // Filtros con los que se generó el reporte mostrado: las exportaciones usan estos, no los campos actuales.
  const [filtrosDelReporte, setFiltrosDelReporte] = useState<FiltrosReporteExposiciones>({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof FiltrosReporteExposiciones, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));

  /** Limpiar vacía los filtros y quita el reporte mostrado. */
  function limpiar() {
    setFiltros({});
    setReporte(null);
    setFiltrosDelReporte({});
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await generarReporteExposiciones(filtros);
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
      <EncabezadoPagina etiqueta="Reportes" titulo={TITULO_REPORTE_EXPOSICIONES} />
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
              <Campo etiqueta={l.estado} htmlFor="estado">
                <Seleccion id="estado" value={filtros.estado ?? ""} onChange={(e) => cambiar("estado", e.target.value)}>
                  <option value="">{TEXTO_TODOS}</option>
                  {VIGENCIAS.filter((v) => v !== "todas").map((v) => (
                    <option key={v} value={v}>
                      {ETIQUETAS_ESTADO_EXPOSICION[v as keyof typeof ETIQUETAS_ESTADO_EXPOSICION]}
                    </option>
                  ))}
                </Seleccion>
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
            hrefPdf={reporte ? `/reportes/exposiciones/pdf?${parametros}` : undefined}
            hrefExcel={reporte ? `/reportes/exposiciones/excel?${parametros}` : undefined}
          />
        </form>
      </Celda>

      {reporte && (
        <Celda titulo={TITULO_RESULTADOS_REPORTE_EXPOSICIONES}>
          <TablaReporteExposiciones reporte={reporte} />
        </Celda>
      )}
    </div>
  );
}

/** Tabla del reporte de exposiciones. Cantidad angosta y centrada, piezas con el mayor ancho, museo con su nombre completo. */
export function TablaReporteExposiciones({ reporte }: { reporte: ReporteExposiciones }) {
  const c = COLUMNAS_REPORTE_EXPOSICIONES;
  const t = tablaEstilos;
  return (
    <Tabla resumen={TITULO_RESULTADOS_REPORTE_EXPOSICIONES} clase={t.tabla}>
      <thead>
        <tr>
          <th className={estilos.nombre}>{c.nombre}</th>
          <th>{c.museo}</th>
          <th className={t.ajustada}>{c.estado}</th>
          <th className={t.ajustada}>{c.inicio}</th>
          <th className={t.ajustada}>{c.fin}</th>
          <th className={`${t.ajustada} ${t.centrada}`}>{c.cantidad}</th>
          <th className={estilos.piezasColumna}>{c.piezas}</th>
        </tr>
      </thead>
      <tbody>
        {reporte.filas.map((f) => (
          <tr key={f.id}>
            <td>{f.nombre}</td>
            <td className={t.linea}>{f.museo}</td>
            <td className={t.ajustada}>
              <Insignia valor={ETIQUETAS_ESTADO_EXPOSICION[f.estado]} />
            </td>
            <td className={`${t.ajustada} ${t.linea}`}>{formatearFecha(f.fechaInicio)}</td>
            <td className={`${t.ajustada} ${t.linea}`}>{formatearFecha(f.fechaFin)}</td>
            <td className={`${t.ajustada} ${t.centrada}`}>{f.cantidadPiezas}</td>
            <td>
              <ul className={estilos.piezas}>
                {f.piezas.map((p) => (
                  <li key={p.codigo}>
                    {p.codigo} {p.nombre}
                  </li>
                ))}
              </ul>
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={7}>
            {TOTAL_EXPOSICIONES}: {reporte.total}
          </td>
        </tr>
      </tfoot>
    </Tabla>
  );
}
