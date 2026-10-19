"use client";

import { useState } from "react";
import { generarReporte } from "@/lib/controllers/CC_Reporte";
import { ESTADOS_CONSERVACION, ETIQUETAS_ESTADO_CONSERVACION, TITULO_REPORTE, TITULO_RESULTADOS_REPORTE, ETIQUETA_CATEGORIA, ETIQUETA_ESTADO_CONSERVACION } from "@/lib/constantes";
import { filtrosAParametros } from "@/lib/reporteParametros";
import type { Categoria, FiltrosReporte, Reporte } from "@/lib/tipos";
import BotonesReporte from "@/components/ui/BotonesReporte";
import { Campo, Entrada, Filtros, Seleccion } from "@/components/ui/Campo";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Tabla from "@/components/ui/Tabla";
import estilos from "./CI_Reporte_Categoria_Estado.module.css";
import { alertaError } from "@/components/ui/alertas";

export default function CI_Reporte_Categoria_Estado({ categorias }: { categorias: Categoria[] }) {
  const [filtros, setFiltros] = useState<FiltrosReporte>({});
  const [reporte, setReporte] = useState<Reporte | null>(null);
  // Filtros con los que se generó el reporte mostrado: las exportaciones usan estos, no los campos actuales.
  const [filtrosDelReporte, setFiltrosDelReporte] = useState<FiltrosReporte>({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof FiltrosReporte, valor: string) => setFiltros((f) => ({ ...f, [campo]: valor }));

  /** Limpiar vacía los filtros y quita el reporte mostrado, dejando la pantalla como al entrar. */
  function limpiar() {
    setFiltros({});
    setReporte(null);
    setFiltrosDelReporte({});
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await generarReporte(filtros);
    if (resultado.ok) {
      setReporte(resultado.datos ?? null);
      setFiltrosDelReporte(filtros);
    } else {
      setReporte(null);
      alertaError(resultado.error);
    }
    setEnviando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Reportes" titulo={TITULO_REPORTE} />
      <Celda titulo="Filtros">
        <form onSubmit={alEnviar} className={estilos.formulario} noValidate>
          <Filtros>
            <Campo etiqueta={ETIQUETA_CATEGORIA} htmlFor="categoria">
              <Seleccion id="categoria" value={filtros.categoriaId ?? ""} onChange={(e) => cambiar("categoriaId", e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta={ETIQUETA_ESTADO_CONSERVACION} htmlFor="estado">
              <Seleccion id="estado" value={filtros.estado ?? ""} onChange={(e) => cambiar("estado", e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_CONSERVACION.map((s) => (
                  <option key={s} value={s}>
                    {ETIQUETAS_ESTADO_CONSERVACION[s]}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Fecha de registro desde" htmlFor="desde">
              <Entrada id="desde" type="date" value={filtros.desde ?? ""} onChange={(e) => cambiar("desde", e.target.value)} />
            </Campo>
            <Campo etiqueta="Fecha de registro hasta" htmlFor="hasta">
              <Entrada id="hasta" type="date" value={filtros.hasta ?? ""} onChange={(e) => cambiar("hasta", e.target.value)} />
            </Campo>
          </Filtros>
          <BotonesReporte
            enviando={enviando}
            onLimpiar={limpiar}
            hrefPdf={reporte ? `/reportes/categoria-estado/pdf?${filtrosAParametros(filtrosDelReporte)}` : undefined}
            hrefExcel={reporte ? `/reportes/categoria-estado/excel?${filtrosAParametros(filtrosDelReporte)}` : undefined}
          />
        </form>
      </Celda>

      {reporte && (
        <Celda titulo={TITULO_RESULTADOS_REPORTE}>
          <Tabla resumen="Reporte de inventario">
            <thead>
              <tr>
                <th>Categoría</th>
                {reporte.estados.map((s) => (
                  <th key={s} data-numero="true">
                    {ETIQUETAS_ESTADO_CONSERVACION[s]}
                  </th>
                ))}
                <th data-numero="true">Total</th>
              </tr>
            </thead>
            <tbody>
              {reporte.filas.map((f) => (
                <tr key={f.categoria}>
                  <td>{f.categoria}</td>
                  {reporte.estados.map((s) => (
                    <td key={s} data-numero="true">
                      {f.porEstado[s]}
                    </td>
                  ))}
                  <td data-numero="true">
                    <strong>{f.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Totales</td>
                {reporte.estados.map((s) => (
                  <td key={s} data-numero="true">
                    {reporte.totalesPorEstado[s]}
                  </td>
                ))}
                <td data-numero="true">{reporte.totalGeneral}</td>
              </tr>
            </tfoot>
          </Tabla>
        </Celda>
      )}
    </div>
  );
}
