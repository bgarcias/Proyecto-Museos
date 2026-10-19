"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cerrarInventario, marcarPieza } from "@/lib/controllers/CC_Inventario";
import {
  ETIQUETA_INVENTARIO_CERRADO_POR,
  ETIQUETA_INVENTARIO_INICIADO_POR,
  ETIQUETAS_ESTADO_INVENTARIO,
  ETIQUETAS_RESULTADO_INVENTARIO,
  RESULTADOS_INVENTARIO,
} from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import type { FilaInventario, InventarioListado, ResultadoInventario, ResumenInventario } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { Entrada } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import Tabla from "@/components/ui/Tabla";
import estilos from "./CI_Realizar_Inventario.module.css";

type Marca = { resultado?: ResultadoInventario; observacion: string };

/** Conteo de un inventario en curso y vista de solo lectura de un inventario cerrado, con su resumen. */
export default function CI_Realizar_Inventario({
  inventario,
  filas,
  resumen,
}: {
  inventario: InventarioListado;
  filas: FilaInventario[];
  resumen: ResumenInventario | null;
}) {
  const router = useRouter();
  const enCurso = inventario.estado === "en_curso";
  const [marcas, setMarcas] = useState<Record<string, Marca>>(() =>
    Object.fromEntries(filas.map((f) => [f.piezaId, { resultado: f.resultado, observacion: f.observacion ?? "" }])),
  );
  const [guardadas, setGuardadas] = useState<Set<string>>(
    () => new Set(filas.filter((f) => f.resultado).map((f) => f.piezaId)),
  );
  const [cerrando, setCerrando] = useState(false);

  const marcadas = filas.filter((f) => marcas[f.piezaId]?.resultado).length;

  /** Cada marca se guarda al marcarla. */
  async function guardar(piezaId: string, resultado: ResultadoInventario, observacion: string) {
    const resultadoGuardado = await marcarPieza(inventario.id, piezaId, resultado, observacion);
    if (resultadoGuardado.ok) {
      setGuardadas((s) => new Set(s).add(piezaId));
    } else {
      alertaError(resultadoGuardado.error);
    }
  }

  function elegirResultado(piezaId: string, resultado: ResultadoInventario) {
    const observacion = marcas[piezaId]?.observacion ?? "";
    setMarcas((m) => ({ ...m, [piezaId]: { resultado, observacion } }));
    void guardar(piezaId, resultado, observacion);
  }

  function cambiarObservacion(piezaId: string, observacion: string) {
    setMarcas((m) => ({ ...m, [piezaId]: { resultado: m[piezaId]?.resultado, observacion } }));
  }

  /** La observación se guarda al salir del campo, si la pieza ya tiene resultado. */
  function guardarObservacion(piezaId: string) {
    const marca = marcas[piezaId];
    if (marca?.resultado) void guardar(piezaId, marca.resultado, marca.observacion);
  }

  async function cerrar() {
    setCerrando(true);
    const resultado = await cerrarInventario(inventario.id);
    if (resultado.ok) {
      // La alerta se dispara antes de mostrar el inventario cerrado con su resumen
      alertaExito(resultado.mensaje ?? "");
      router.refresh();
      return;
    }
    alertaError(resultado.error);
    setCerrando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Inventarios" titulo={`Inventario de ${inventario.museoNombre}`} />

      <Celda titulo="Datos del inventario">
        <dl className={estilos.resumen}>
          <div>
            <dt>{ETIQUETA_INVENTARIO_INICIADO_POR}</dt>
            <dd>{inventario.iniciadoPorNombre}</dd>
          </div>
          <div>
            <dt>Fecha de inicio</dt>
            <dd>{formatearFecha(inventario.fechaInicio)}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <Insignia valor={ETIQUETAS_ESTADO_INVENTARIO[inventario.estado]} />
            </dd>
          </div>
          {!enCurso && (
            <div>
              <dt>{ETIQUETA_INVENTARIO_CERRADO_POR}</dt>
              <dd>{inventario.cerradoPorNombre ?? "-"}</dd>
            </div>
          )}
          {inventario.fechaCierre && (
            <div>
              <dt>Fecha de cierre</dt>
              <dd>{formatearFecha(inventario.fechaCierre)}</dd>
            </div>
          )}
        </dl>
      </Celda>

      {resumen && (
        <Celda titulo="Resumen">
          <dl className={estilos.resumen}>
            <div>
              <dt>Encontradas</dt>
              <dd>{resumen.encontradas}</dd>
            </div>
            <div>
              <dt>No encontradas</dt>
              <dd>{resumen.noEncontradas.length}</dd>
            </div>
            <div>
              <dt>Con daño</dt>
              <dd>{resumen.conDano.length}</dd>
            </div>
          </dl>
          {resumen.noEncontradas.length > 0 && (
            <>
              <h2>Piezas no encontradas</h2>
              <Tabla resumen="Piezas no encontradas">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.noEncontradas.map((f) => (
                    <tr key={f.piezaId}>
                      <td>{f.codigo}</td>
                      <td>{f.nombre}</td>
                      <td>{f.observacion ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </>
          )}
          {resumen.conDano.length > 0 && (
            <>
              <h2>Piezas con daño</h2>
              <Tabla resumen="Piezas con daño">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.conDano.map((f) => (
                    <tr key={f.piezaId}>
                      <td>{f.codigo}</td>
                      <td>{f.nombre}</td>
                      <td>{f.observacion ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </>
          )}
        </Celda>
      )}

      <Celda titulo={enCurso ? "Piezas esperadas" : "Piezas contadas"}>
        {enCurso && (
          <p className={estilos.progreso}>
            Marcadas {marcadas} de {filas.length}
          </p>
        )}
        <Tabla resumen="Piezas del inventario" clase={estilos.piezas}>
          <thead>
            <tr>
              <th>Imagen</th>
              <th className={`${estilos.ajustada} ${estilos.linea}`}>Código</th>
              <th>Nombre</th>
              <th>Ubicación</th>
              <th>Resultado</th>
              <th>Observación</th>
              {enCurso && <th className={`${estilos.ajustada} ${estilos.linea}`}>Guardado</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={enCurso ? 7 : 6}>Este museo no tiene piezas para inventariar</td>
              </tr>
            )}
            {filas.map((f) => {
              const marca = marcas[f.piezaId];
              return (
                <tr key={f.piezaId}>
                  <td>
                    <Miniatura src={f.imagenUrl} alt={`Imagen de ${f.nombre}`} />
                  </td>
                  <td className={`${estilos.ajustada} ${estilos.linea}`}>{f.codigo}</td>
                  <td>{f.nombre}</td>
                  <td>{f.ubicacionFisica ?? "-"}</td>
                  <td>
                    {enCurso ? (
                      <div className={estilos.opciones} role="radiogroup" aria-label={`Resultado de ${f.nombre}`}>
                        {RESULTADOS_INVENTARIO.map((r) => (
                          <label key={r} className={estilos.opcion}>
                            <input
                              type="radio"
                              name={`resultado-${f.piezaId}`}
                              checked={marca?.resultado === r}
                              onChange={() => elegirResultado(f.piezaId, r)}
                            />
                            {ETIQUETAS_RESULTADO_INVENTARIO[r]}
                          </label>
                        ))}
                      </div>
                    ) : f.resultado ? (
                      <Insignia valor={ETIQUETAS_RESULTADO_INVENTARIO[f.resultado]} />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {enCurso ? (
                      <Entrada
                        aria-label={`Observación de ${f.nombre}`}
                        value={marca?.observacion ?? ""}
                        onChange={(e) => cambiarObservacion(f.piezaId, e.target.value)}
                        onBlur={() => guardarObservacion(f.piezaId)}
                      />
                    ) : (
                      (f.observacion ?? "-")
                    )}
                  </td>
                  {enCurso && (
                    <td className={`${estilos.ajustada} ${estilos.linea}`}>
                      {guardadas.has(f.piezaId) && <span className={estilos.guardado}>Guardado</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Tabla>
        <Acciones>
          {enCurso && (
            <Boton onClick={cerrar} disabled={cerrando}>
              Cerrar inventario
            </Boton>
          )}
          <BotonEnlace href="/inventarios">Volver</BotonEnlace>
        </Acciones>
      </Celda>
    </div>
  );
}
