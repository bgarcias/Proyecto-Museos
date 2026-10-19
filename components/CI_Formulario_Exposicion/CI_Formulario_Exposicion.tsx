"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarExposicion, registrarExposicion } from "@/lib/controllers/CC_Exposicion";
import { ETIQUETAS_ESTADO_CONSERVACION, MENSAJE_EXPOSICION_SIN_PIEZAS } from "@/lib/constantes";
import type { Categoria, ConflictoPieza, ExposicionListado, Museo, PiezaListado } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import BuscadorPiezas from "@/components/ui/BuscadorPiezas";
import { AreaTexto, Campo, Entrada, Formulario, Seleccion } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Mensaje from "@/components/ui/Mensaje";
import Miniatura from "@/components/ui/Miniatura";
import PopupSeleccion from "@/components/ui/PopupSeleccion";
import estilos from "./CI_Formulario_Exposicion.module.css";

/** Nueva exposición (sin datos) o modificar una existente (con la exposición y sus piezas actuales). */
export default function CI_Formulario_Exposicion({
  exposicion,
  piezasActuales,
  museos,
  categorias,
  limite,
}: {
  exposicion: ExposicionListado | null;
  piezasActuales: PiezaListado[];
  museos: Museo[];
  categorias: Categoria[];
  /** Última fecha permitida para las fechas de la exposición, calculada en el servidor. */
  limite: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(exposicion?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(exposicion?.descripcion ?? "");
  const [museoId, setMuseoId] = useState<string>(exposicion?.museoId ?? (museos.length === 1 ? museos[0].id : ""));
  const [fechaInicio, setFechaInicio] = useState(exposicion?.fechaInicio ?? "");
  const [fechaFin, setFechaFin] = useState(exposicion?.fechaFin ?? "");
  const [piezas, setPiezas] = useState<PiezaListado[]>(piezasActuales);
  const [conflictos, setConflictos] = useState<ConflictoPieza[]>([]);
  const [errorConflictos, setErrorConflictos] = useState("");
  const [popupAbierto, setPopupAbierto] = useState(false);
  const [temporales, setTemporales] = useState<PiezaListado[]>([]);
  const [enviando, setEnviando] = useState(false);

  /** Paso 4: "Agregar piezas" abre la búsqueda de piezas (selección múltiple) del museo sede elegido. */
  function agregarPiezas() {
    if (!museoId) {
      alertaError("Selecciona el museo sede");
      return;
    }
    setTemporales(piezas.filter((p) => p.museoId === museoId));
    setPopupAbierto(true);
  }

  function alternarTemporal(pieza: PiezaListado) {
    setTemporales((actuales) =>
      actuales.some((p) => p.id === pieza.id) ? actuales.filter((p) => p.id !== pieza.id) : [...actuales, pieza],
    );
  }

  /** Paso 6: confirmar la selección de piezas. */
  function confirmarSeleccion() {
    setPiezas(temporales);
    setConflictos([]);
    setErrorConflictos("");
    setPopupAbierto(false);
  }

  function quitarPieza(id: string) {
    setPiezas((actuales) => actuales.filter((p) => p.id !== id));
    setConflictos((actuales) => actuales.filter((c) => c.piezaId !== id));
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (piezas.length === 0) {
      alertaError(MENSAJE_EXPOSICION_SIN_PIEZAS);
      return;
    }
    setEnviando(true);
    setConflictos([]);
    setErrorConflictos("");
    const entrada = { nombre, descripcion, museoId, fechaInicio, fechaFin, piezaIds: piezas.map((p) => p.id) };
    const resultado = exposicion ? await actualizarExposicion(exposicion.id, entrada) : await registrarExposicion(entrada);
    if (resultado.ok) {
      // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en el módulo de exposiciones.
      alertaExito(resultado.mensaje);
      router.push("/exposiciones");
      return;
    }
    if (resultado.conflictos && resultado.conflictos.length > 0) {
      // Las piezas en conflicto quedan visibles en la pantalla, para quitarlas de la selección
      setConflictos(resultado.conflictos);
      setErrorConflictos(resultado.error);
    } else {
      alertaError(resultado.error);
    }
    setEnviando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Exposiciones" titulo={exposicion ? "Modificar exposición" : "Nueva exposición"} />
      <Celda estrecha>
        <Formulario onSubmit={alEnviar}>
          <Campo etiqueta="Nombre" htmlFor="nombre" obligatorio>
            <Entrada id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo etiqueta="Descripción" htmlFor="descripcion">
            <AreaTexto id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Campo>
          <Campo etiqueta="Museo sede" htmlFor="museo" obligatorio>
            <Seleccion id="museo" value={museoId} onChange={(e) => setMuseoId(e.target.value)}>
              <option value="">Selecciona un museo</option>
              {museos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Seleccion>
          </Campo>
          <Campo etiqueta="Fecha de inicio" htmlFor="inicio" obligatorio>
            <Entrada id="inicio" type="date" max={limite} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </Campo>
          <Campo etiqueta="Fecha de fin" htmlFor="fin" obligatorio>
            <Entrada id="fin" type="date" max={limite} value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
          </Campo>

          <div className={estilos.piezas}>
            <Acciones>
              <Boton variante="secundario" onClick={agregarPiezas}>
                Agregar piezas
              </Boton>
            </Acciones>
            {piezas.length === 0 ? (
              <p className={estilos.vacio}>Aún no se han agregado piezas.</p>
            ) : (
              piezas.map((p) => (
                <div key={p.id} className={estilos.pieza}>
                  <Miniatura src={p.imagenUrl} alt={`Imagen de ${p.nombre}`} />
                  <span>
                    {p.codigo} · {p.nombre}
                  </span>
                  <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[p.estadoConservacion]} />
                  <Boton variante="secundario" pequeno onClick={() => quitarPieza(p.id)}>
                    Quitar
                  </Boton>
                </div>
              ))
            )}
          </div>

          {conflictos.length > 0 && (
            <Mensaje tipo="error">
              <span>{errorConflictos}</span>
              <ul className={estilos.conflictos}>
                {conflictos.map((c) => (
                  <li key={c.piezaId}>
                    {c.piezaNombre}: {c.motivo}
                  </li>
                ))}
              </ul>
              <span>Quítalas de la selección para continuar.</span>
            </Mensaje>
          )}

          <Acciones>
            <Boton type="submit" disabled={enviando}>
              Guardar
            </Boton>
            <BotonEnlace href="/exposiciones">Cancelar</BotonEnlace>
          </Acciones>
        </Formulario>
      </Celda>

      {popupAbierto && (
        <PopupSeleccion
          titulo="Buscar piezas"
          onCerrar={() => setPopupAbierto(false)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setPopupAbierto(false)}>
                Cancelar
              </Boton>
              <Boton onClick={confirmarSeleccion}>Confirmar selección</Boton>
            </>
          }
        >
          <p>
            Solo se muestran piezas del museo sede. Elegidas: {temporales.length}
          </p>
          <BuscadorPiezas
            key={museoId}
            modo="seleccion"
            museos={museos}
            categorias={categorias}
            museoIdFijo={museoId}
            seleccionadas={temporales.map((p) => p.id)}
            onAlternar={alternarTemporal}
          />
        </PopupSeleccion>
      )}
    </div>
  );
}
