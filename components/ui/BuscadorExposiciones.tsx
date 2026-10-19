"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { buscarExposiciones } from "@/lib/controllers/CC_Exposicion";
import { ETIQUETAS_ESTADO_EXPOSICION, VIGENCIAS } from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import { textoResultadoBusqueda } from "@/lib/resultadoBusqueda";
import type { ExposicionListado, FiltrosExposiciones, Museo, Vigencia } from "@/lib/tipos";
import Boton from "./Boton";
import { Campo, Entrada, Seleccion } from "./Campo";
import Insignia from "./Insignia";
import Tabla from "./Tabla";
import estilos from "./Buscador.module.css";

type Props = {
  museos: Museo[];
  /** Lista inicial ya cargada por la página, sin filtros. Si no se da, se carga al abrir. */
  exposicionesIniciales?: ExposicionListado[];
  /** Con onElegir, el buscador funciona como popup de selección única. */
  elegidaId?: string;
  onElegir?: (exposicion: ExposicionListado) => void;
};

const FILTROS_INICIALES: FiltrosExposiciones = { vigencia: "todas" };

/** Hay filtros aplicados si alguno se aparta de su valor inicial. */
function hayFiltros(f: FiltrosExposiciones): boolean {
  return Boolean(f.nombre?.trim() || (f.vigencia && f.vigencia !== "todas") || f.museoId);
}

/** Un solo buscador, como página y como popup. */
export default function BuscadorExposiciones({ museos, exposicionesIniciales, elegidaId, onElegir }: Props) {
  // Lo escrito y lo aplicado con Buscar o Enter son cosas distintas.
  const [filtros, setFiltros] = useState<FiltrosExposiciones>(FILTROS_INICIALES);
  const [aplicados, setAplicados] = useState<FiltrosExposiciones>(FILTROS_INICIALES);
  const [exposiciones, setExposiciones] = useState<ExposicionListado[] | null>(exposicionesIniciales ?? null);
  const [total, setTotal] = useState<number | null>(exposicionesIniciales?.length ?? null);
  const consulta = useRef(0);
  const seleccion = Boolean(onElegir);
  const prefijo = seleccion ? "selexp" : "exp";

  async function consultar(f: FiltrosExposiciones) {
    const numero = ++consulta.current;
    const resultado = await buscarExposiciones(f);
    if (numero !== consulta.current) return;
    setExposiciones(resultado);
    // Sin filtros, la lista completa es también el total de exposiciones visibles.
    if (!hayFiltros(f)) setTotal(resultado.length);
  }

  // El popup de selección consulta al abrir. La lista del módulo parte de la que cargó la página.
  useEffect(() => {
    if (exposicionesIniciales === undefined) void consultar(FILTROS_INICIALES);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si la página entrega una lista nueva (por ejemplo tras cancelar o modificar una exposición), el estado local
  // queda viejo: se actualiza el total y se vuelve a consultar con los filtros aplicados.
  const inicialesAnteriores = useRef(exposicionesIniciales);
  useEffect(() => {
    if (exposicionesIniciales === inicialesAnteriores.current) return;
    inicialesAnteriores.current = exposicionesIniciales;
    if (exposicionesIniciales === undefined) return;
    setTotal(exposicionesIniciales.length);
    if (hayFiltros(aplicados)) void consultar(aplicados);
    else setExposiciones(exposicionesIniciales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exposicionesIniciales]);

  function buscar() {
    setAplicados(filtros);
    void consultar(filtros);
  }

  function limpiar() {
    setFiltros(FILTROS_INICIALES);
    setAplicados(FILTROS_INICIALES);
    void consultar(FILTROS_INICIALES);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      buscar();
    }
  }

  const estiloFiltros = { "--columnas-filtros": 3 } as CSSProperties;

  return (
    <div className={estilos.buscador}>
      <div className={estilos.filtros} style={estiloFiltros} onKeyDown={alTeclear}>
        <Campo etiqueta="Nombre" htmlFor={`${prefijo}-nombre`}>
          <Entrada
            id={`${prefijo}-nombre`}
            value={filtros.nombre ?? ""}
            onChange={(e) => setFiltros((f) => ({ ...f, nombre: e.target.value }))}
          />
        </Campo>
        <Campo etiqueta="Vigencia" htmlFor={`${prefijo}-vigencia`}>
          <Seleccion
            id={`${prefijo}-vigencia`}
            value={filtros.vigencia}
            onChange={(e) => setFiltros((f) => ({ ...f, vigencia: e.target.value as Vigencia }))}
          >
            {VIGENCIAS.map((v) => (
              <option key={v} value={v}>
                {v === "todas" ? "Todas" : ETIQUETAS_ESTADO_EXPOSICION[v]}
              </option>
            ))}
          </Seleccion>
        </Campo>
        <Campo etiqueta="Museo" htmlFor={`${prefijo}-museo`}>
          <Seleccion
            id={`${prefijo}-museo`}
            value={filtros.museoId ?? ""}
            onChange={(e) => setFiltros((f) => ({ ...f, museoId: e.target.value || undefined }))}
          >
            <option value="">Todos</option>
            {museos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </Seleccion>
        </Campo>
        <div className={estilos.botonesFiltros}>
          <Boton onClick={buscar}>Buscar</Boton>
          <Boton variante="secundario" onClick={limpiar}>
            Limpiar
          </Boton>
        </div>
      </div>

      {exposiciones !== null && total !== null && (
        <p className={estilos.resultado} role="status">
          {textoResultadoBusqueda(exposiciones.length, total, hayFiltros(aplicados), "exposición", "exposiciones")}
        </p>
      )}

      <Tabla resumen="Exposiciones">
        <thead>
          <tr>
            {seleccion && <th>Elegir</th>}
            <th>Nombre</th>
            <th>Fechas</th>
            <th>Museo</th>
            <th>Estado</th>
            <th data-numero="true">Piezas</th>
          </tr>
        </thead>
        <tbody>
          {exposiciones === null && (
            <tr>
              <td colSpan={6}>Cargando exposiciones</td>
            </tr>
          )}
          {exposiciones?.length === 0 && (
            <tr>
              <td colSpan={6}>No se encontraron exposiciones</td>
            </tr>
          )}
          {exposiciones?.map((e) => (
            <tr key={e.id} data-seleccionada={seleccion && elegidaId === e.id}>
              {seleccion && (
                <td>
                  <input
                    type="radio"
                    name="exposicion-elegida"
                    className={estilos.casilla}
                    checked={elegidaId === e.id}
                    onChange={() => onElegir?.(e)}
                    aria-label={`Elegir ${e.nombre}`}
                  />
                </td>
              )}
              <td>{e.nombre}</td>
              <td>
                {formatearFecha(e.fechaInicio)} a {formatearFecha(e.fechaFin)}
              </td>
              <td>{e.museoNombre}</td>
              <td>
                <Insignia valor={ETIQUETAS_ESTADO_EXPOSICION[e.estado]} />
              </td>
              <td data-numero="true">{e.cantidadPiezas}</td>
            </tr>
          ))}
        </tbody>
      </Tabla>
    </div>
  );
}
