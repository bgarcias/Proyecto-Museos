"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { buscarPiezas } from "@/lib/controllers/CC_Pieza";
import {
  DISPONIBILIDADES,
  ESTADOS_CONSERVACION,
  ETIQUETAS_DISPONIBILIDAD,
  ETIQUETAS_ESTADO_CONSERVACION,
} from "@/lib/constantes";
import { textoResultadoBusqueda } from "@/lib/resultadoBusqueda";
import type { Categoria, FiltrosPiezas, Museo, PiezaListado } from "@/lib/tipos";
import Boton, { BotonEnlace } from "./Boton";
import { Campo, Entrada, Seleccion } from "./Campo";
import Insignia from "./Insignia";
import Miniatura from "./Miniatura";
import Tabla from "./Tabla";
import estilos from "./Buscador.module.css";

type Props = {
  museos: Museo[];
  categorias: Categoria[];
  /** Lista inicial ya cargada por la página, sin filtros. Si no se da, se carga al abrir. */
  piezasIniciales?: PiezaListado[];
  /** En las ventanas de selección solo se muestran piezas de este museo. */
  museoIdFijo?: string;
  /**
   * "catalogo": acciones por fila.
   * "seleccion": casillas de selección múltiple.
   * "seleccion-unica": botones de opción de selección única.
   */
  modo: "catalogo" | "seleccion" | "seleccion-unica";
  seleccionadas?: string[];
  /** En selección múltiple alterna la pieza. En selección única la elige. */
  onAlternar?: (pieza: PiezaListado) => void;
};

/** Buscador de piezas: se construye una sola vez y se usa como página y como ventana emergente. */
export default function BuscadorPiezas({
  museos,
  categorias,
  piezasIniciales,
  museoIdFijo,
  modo,
  seleccionadas = [],
  onAlternar,
}: Props) {
  // La selección única (préstamos) solo ofrece piezas disponibles, filtradas en el servidor, y solo filtra por código y nombre.
  const soloDisponibles = modo === "seleccion-unica";
  const base: FiltrosPiezas = { museoId: museoIdFijo, soloDisponibles: soloDisponibles || undefined };
  // Lo que la persona escribe y lo que se aplicó con Buscar o Enter son cosas distintas.
  const [filtros, setFiltros] = useState<FiltrosPiezas>(base);
  const [aplicados, setAplicados] = useState<FiltrosPiezas>(base);
  const [piezas, setPiezas] = useState<PiezaListado[] | null>(piezasIniciales ?? null);
  const [total, setTotal] = useState<number | null>(piezasIniciales?.length ?? null);
  const consulta = useRef(0);
  const catalogo = modo === "catalogo";
  const seleccion = !catalogo;

  const hayFiltros = (f: FiltrosPiezas) =>
    Boolean(f.codigo?.trim() || f.nombre?.trim() || f.categoriaId || f.estado || f.disponibilidad || (museoIdFijo === undefined && f.museoId));

  async function consultar(f: FiltrosPiezas) {
    const numero = ++consulta.current;
    const resultado = await buscarPiezas(f);
    if (numero !== consulta.current) return;
    setPiezas(resultado);
    // Sin filtros, la lista completa es también el total de piezas visibles.
    if (!hayFiltros(f)) setTotal(resultado.length);
  }

  // Las ventanas de selección consultan al abrir. El catálogo parte de la lista que cargó la página.
  useEffect(() => {
    if (piezasIniciales === undefined) void consultar(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si la página entrega una lista inicial nueva (por ejemplo tras refrescar la ruta), el estado local ya no la
  // refleja: se actualiza el total y se vuelve a consultar con los filtros aplicados.
  const inicialesAnteriores = useRef(piezasIniciales);
  useEffect(() => {
    if (piezasIniciales === inicialesAnteriores.current) return;
    inicialesAnteriores.current = piezasIniciales;
    if (piezasIniciales === undefined) return;
    setTotal(piezasIniciales.length);
    if (hayFiltros(aplicados)) void consultar(aplicados);
    else setPiezas(piezasIniciales);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piezasIniciales]);

  const cambiar = (campo: keyof FiltrosPiezas, valor: string) =>
    setFiltros((f) => ({ ...f, [campo]: valor || undefined }));

  function buscar() {
    setAplicados(filtros);
    void consultar(filtros);
  }

  function limpiar() {
    setFiltros(base);
    setAplicados(base);
    void consultar(base);
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
      e.preventDefault();
      buscar();
    }
  }

  const prefijo = catalogo ? "cat" : "sel";
  const columnas = catalogo ? 7 : 6;
  const conMuseo = museoIdFijo === undefined;
  const cantidadFiltros = soloDisponibles ? 2 : conMuseo ? 6 : 5;
  const estiloFiltros = { "--columnas-filtros": cantidadFiltros } as CSSProperties;

  return (
    <div className={estilos.buscador}>
      <div className={estilos.filtros} style={estiloFiltros} onKeyDown={alTeclear}>
        <Campo etiqueta="Código" htmlFor={`${prefijo}-codigo`}>
          <Entrada id={`${prefijo}-codigo`} value={filtros.codigo ?? ""} onChange={(e) => cambiar("codigo", e.target.value)} />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor={`${prefijo}-nombre`}>
          <Entrada id={`${prefijo}-nombre`} value={filtros.nombre ?? ""} onChange={(e) => cambiar("nombre", e.target.value)} />
        </Campo>
        {!soloDisponibles && (
          <>
            <Campo etiqueta="Categoría" htmlFor={`${prefijo}-categoria`}>
              <Seleccion id={`${prefijo}-categoria`} value={filtros.categoriaId ?? ""} onChange={(e) => cambiar("categoriaId", e.target.value)}>
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Estado" htmlFor={`${prefijo}-estado`}>
              <Seleccion id={`${prefijo}-estado`} value={filtros.estado ?? ""} onChange={(e) => cambiar("estado", e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_CONSERVACION.map((s) => (
                  <option key={s} value={s}>
                    {ETIQUETAS_ESTADO_CONSERVACION[s]}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Campo etiqueta="Disponibilidad" htmlFor={`${prefijo}-disponibilidad`}>
              <Seleccion id={`${prefijo}-disponibilidad`} value={filtros.disponibilidad ?? ""} onChange={(e) => cambiar("disponibilidad", e.target.value)}>
                <option value="">Todas</option>
                {DISPONIBILIDADES.map((d) => (
                  <option key={d} value={d}>
                    {ETIQUETAS_DISPONIBILIDAD[d]}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            {conMuseo && (
              <Campo etiqueta="Museo" htmlFor={`${prefijo}-museo`}>
                <Seleccion id={`${prefijo}-museo`} value={filtros.museoId ?? ""} onChange={(e) => cambiar("museoId", e.target.value)}>
                  <option value="">Todos</option>
                  {museos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            )}
          </>
        )}
        <div className={estilos.botonesFiltros}>
          <Boton onClick={buscar}>Buscar</Boton>
          <Boton variante="secundario" onClick={limpiar}>
            Limpiar
          </Boton>
        </div>
      </div>

      {piezas !== null && total !== null && (
        <p className={estilos.resultado} role="status">
          {textoResultadoBusqueda(piezas.length, total, hayFiltros(aplicados), "pieza", "piezas")}
        </p>
      )}

      <Tabla resumen="Piezas">
        <thead>
          <tr>
            {seleccion && <th className={estilos.colAjustada}>Elegir</th>}
            <th className={catalogo ? estilos.colImagen : estilos.colMiniatura}>Imagen</th>
            <th className={estilos.colCodigo}>Código</th>
            <th>Nombre</th>
            <th className={estilos.colAjustada}>Estado</th>
            <th className={estilos.colAjustada}>Disponibilidad</th>
            {catalogo && <th>Museo</th>}
            {catalogo && <th className={estilos.colAcciones}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {piezas === null && (
            <tr>
              <td colSpan={columnas}>Cargando piezas</td>
            </tr>
          )}
          {piezas?.length === 0 && (
            <tr>
              <td colSpan={columnas}>No se encontraron piezas</td>
            </tr>
          )}
          {piezas?.map((p) => {
            const elegida = seleccionadas.includes(p.id);
            return (
              <tr key={p.id} data-seleccionada={seleccion && elegida}>
                {seleccion && (
                  <td className={estilos.colAjustada}>
                    <input
                      type={modo === "seleccion-unica" ? "radio" : "checkbox"}
                      name={modo === "seleccion-unica" ? "pieza-elegida" : undefined}
                      className={estilos.casilla}
                      checked={elegida}
                      onChange={() => onAlternar?.(p)}
                      aria-label={`Elegir ${p.nombre}`}
                    />
                  </td>
                )}
                <td className={catalogo ? estilos.colImagen : estilos.colMiniatura}>
                  <Miniatura src={p.imagenUrl} alt={`Imagen de ${p.nombre}`} tamano={catalogo ? "lista" : "seleccion"} />
                </td>
                <td className={estilos.colCodigo}>
                  {p.codigo}
                  {p.codigoAnterior && <span className={estilos.codigoAnterior}>{p.codigoAnterior}</span>}
                </td>
                <td>
                  <span className={estilos.nombre}>{p.nombre}</span>
                  <span className={estilos.secundario}>{p.categoriaNombre}</span>
                </td>
                <td className={estilos.colAjustada}>
                  <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[p.estadoConservacion]} />
                </td>
                <td className={estilos.colAjustada}>
                  <Insignia valor={ETIQUETAS_DISPONIBILIDAD[p.disponibilidad]} />
                </td>
                {catalogo && <td className={estilos.cuerpoTabla}>{p.museoNombre}</td>}
                {catalogo && (
                  <td className={estilos.colAcciones}>
                    <div className={estilos.accionesFila}>
                      <BotonEnlace href={`/piezas/${p.id}`} pequeno bloque compacto>
                        Ver detalle
                      </BotonEnlace>
                      <BotonEnlace href={`/piezas/${p.id}/editar`} pequeno bloque compacto>
                        Editar
                      </BotonEnlace>
                      <BotonEnlace href={`/piezas/${p.id}/estado`} pequeno bloque compacto>
                        Actualizar estado de conservación
                      </BotonEnlace>
                      <BotonEnlace href={`/piezas/${p.id}/historial`} pequeno bloque compacto>
                        Ver historial
                      </BotonEnlace>
                      <BotonEnlace href={`/piezas/${p.id}/ficha`} pequeno bloque compacto nuevaPestana>
                        Generar ficha técnica
                      </BotonEnlace>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Tabla>
    </div>
  );
}
