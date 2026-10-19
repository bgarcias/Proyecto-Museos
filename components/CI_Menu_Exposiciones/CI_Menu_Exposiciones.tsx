"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelarExposicion,
  elegirExposicionParaCancelar,
  elegirExposicionParaModificar,
} from "@/lib/controllers/CC_Exposicion";
import { ETIQUETAS_ESTADO_EXPOSICION } from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import type { ExposicionListado, Museo, PiezaResumen } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import BuscadorExposiciones from "@/components/ui/BuscadorExposiciones";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import Ventana from "@/components/ui/Ventana";
import estilos from "./CI_Menu_Exposiciones.module.css";

type Operacion = "modificar" | "cancelar";

/** Módulo de exposiciones: lista y las opciones "Nueva exposición", "Modificar exposición" y "Cancelar exposición". */
export default function CI_Menu_Exposiciones({
  exposiciones,
  museos,
}: {
  exposiciones: ExposicionListado[];
  museos: Museo[];
}) {
  const router = useRouter();
  // Ventana de buscar exposición (selección única), abierta por Modificar o por Cancelar
  const [operacion, setOperacion] = useState<Operacion | null>(null);
  const [elegida, setElegida] = useState<ExposicionListado | null>(null);
  // Resumen de la exposición a cancelar, con su confirmación
  const [resumen, setResumen] = useState<{ exposicion: ExposicionListado; piezas: PiezaResumen[] } | null>(null);
  const [procesando, setProcesando] = useState(false);

  function abrirBusqueda(tipo: Operacion) {
    setElegida(null);
    setOperacion(tipo);
  }

  function cerrarBusqueda() {
    setOperacion(null);
    setElegida(null);
  }

  async function seleccionar() {
    if (!elegida || !operacion) return;
    setProcesando(true);
    if (operacion === "modificar") {
      const resultado = await elegirExposicionParaModificar(elegida.id);
      setProcesando(false);
      if (!resultado.ok) {
        alertaError(resultado.error);
        cerrarBusqueda();
        return;
      }
      router.push(`/exposiciones/${elegida.id}/editar`);
      return;
    }
    const resultado = await elegirExposicionParaCancelar(elegida.id);
    setProcesando(false);
    cerrarBusqueda();
    if (!resultado.ok || !resultado.datos) {
      alertaError(resultado.ok ? "No se encontró la exposición" : resultado.error);
      return;
    }
    setResumen(resultado.datos);
  }

  async function confirmarCancelacion() {
    if (!resumen) return;
    setProcesando(true);
    const resultado = await cancelarExposicion(resumen.exposicion.id);
    setProcesando(false);
    setResumen(null);
    if (resultado.ok) {
      alertaExito(resultado.mensaje ?? "");
      router.refresh();
    } else {
      alertaError(resultado.error);
    }
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        etiqueta="Muestras"
        titulo="Exposiciones"
        acciones={
          <>
            <BotonEnlace href="/exposiciones/nueva" variante="principal">
              Nueva exposición
            </BotonEnlace>
            <Boton variante="secundario" onClick={() => abrirBusqueda("modificar")}>
              Modificar exposición
            </Boton>
            <Boton variante="peligro" onClick={() => abrirBusqueda("cancelar")}>
              Cancelar exposición
            </Boton>
          </>
        }
      />
      <Celda>
        <BuscadorExposiciones museos={museos} exposicionesIniciales={exposiciones} />
      </Celda>

      {operacion && (
        <Ventana
          titulo="Buscar exposición"
          onCerrar={cerrarBusqueda}
          pie={
            <>
              <Boton variante="secundario" onClick={cerrarBusqueda}>
                Cancelar
              </Boton>
              <Boton onClick={seleccionar} disabled={!elegida || procesando}>
                Seleccionar
              </Boton>
            </>
          }
        >
          <BuscadorExposiciones museos={museos} elegidaId={elegida?.id} onElegir={setElegida} />
        </Ventana>
      )}

      {resumen && (
        <Ventana
          titulo="Cancelar exposición"
          dialogo
          onCerrar={() => setResumen(null)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setResumen(null)} disabled={procesando}>
                Volver
              </Boton>
              <Boton onClick={confirmarCancelacion} disabled={procesando}>
                Confirmar
              </Boton>
            </>
          }
        >
          <dl className={estilos.resumen}>
            <div>
              <dt>Nombre</dt>
              <dd>{resumen.exposicion.nombre}</dd>
            </div>
            <div>
              <dt>Museo sede</dt>
              <dd>{resumen.exposicion.museoNombre}</dd>
            </div>
            <div>
              <dt>Fechas</dt>
              <dd>
                {formatearFecha(resumen.exposicion.fechaInicio)} a {formatearFecha(resumen.exposicion.fechaFin)}
              </dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <Insignia valor={ETIQUETAS_ESTADO_EXPOSICION[resumen.exposicion.estado]} />
              </dd>
            </div>
            <div>
              <dt>Piezas asignadas ({resumen.piezas.length})</dt>
              <dd>
                {resumen.piezas.length === 0 ? (
                  "Sin piezas asignadas"
                ) : (
                  <ul className={estilos.piezas}>
                    {resumen.piezas.map((p) => (
                      <li key={p.id} className={estilos.pieza}>
                        <Miniatura src={p.imagenUrl} alt={`Imagen de ${p.nombre}`} />
                        <span>{p.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </dl>
        </Ventana>
      )}
    </div>
  );
}
