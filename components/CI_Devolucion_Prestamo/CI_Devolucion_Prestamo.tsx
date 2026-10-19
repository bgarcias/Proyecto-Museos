"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrarDevolucionPrestamo } from "@/lib/controllers/CC_Prestamo";
import {
  ESTADOS_CONSERVACION,
  ETIQUETAS_ESTADO_CONSERVACION,
  ETIQUETAS_SITUACION_PRESTAMO,
  MENSAJE_PRESTAMO_ESTADO_DEVOLUCION,
} from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import type { PrestamoListado } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { Campo, Formulario, Seleccion } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Mensaje from "@/components/ui/Mensaje";
import Tabla from "@/components/ui/Tabla";
import estilos from "./CI_Devolucion_Prestamo.module.css";

/** Sub flujo "Registrar devolución": lista de préstamos vigentes, resumen y estado de conservación al regresar. */
export default function CI_Devolucion_Prestamo({ prestamos }: { prestamos: PrestamoListado[] }) {
  const router = useRouter();
  const [elegido, setElegido] = useState<PrestamoListado | null>(null);
  const [estado, setEstado] = useState("");
  const [enviando, setEnviando] = useState(false);

  function elegir(prestamo: PrestamoListado) {
    setElegido(prestamo);
    // El estado al regresar se elige siempre: el selector vuelve a quedar vacío
    setEstado("");
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!elegido) return;
    if (!estado) {
      alertaError(MENSAJE_PRESTAMO_ESTADO_DEVOLUCION);
      return;
    }
    setEnviando(true);
    const resultado = await registrarDevolucionPrestamo(elegido.id, estado);
    if (resultado.ok) {
      // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en el módulo de préstamos.
      alertaExito(resultado.mensaje ?? "");
      router.push("/prestamos");
      return;
    }
    alertaError(resultado.error);
    setEnviando(false);
  }

  // Flujo alterno: sin préstamos vigentes el sub flujo finaliza
  if (prestamos.length === 0) {
    return (
      <div className={estilos.pagina}>
        <EncabezadoPagina etiqueta="Préstamos" titulo="Registrar devolución" />
        <Celda estrecha>
          <Mensaje tipo="error">No existen préstamos vigentes</Mensaje>
          <Acciones>
            <BotonEnlace href="/prestamos">Volver</BotonEnlace>
          </Acciones>
        </Celda>
      </div>
    );
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Préstamos" titulo="Registrar devolución" />
      <Celda titulo="Préstamos vigentes">
        <Tabla resumen="Préstamos vigentes">
          <thead>
            <tr>
              <th>Elegir</th>
              <th>Pieza</th>
              <th>Institución destino</th>
              <th>Fecha de devolución prevista</th>
              <th>Situación</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.map((p) => (
              <tr key={p.id} data-seleccionada={elegido?.id === p.id}>
                <td>
                  <input
                    type="radio"
                    name="prestamo-elegido"
                    checked={elegido?.id === p.id}
                    onChange={() => elegir(p)}
                    aria-label={`Elegir el préstamo de ${p.piezaNombre}`}
                  />
                </td>
                <td>
                  {p.piezaCodigo} · {p.piezaNombre}
                </td>
                <td>{p.institucionDestino}</td>
                <td>{formatearFecha(p.fechaDevolucionPrevista)}</td>
                <td>
                  <Insignia valor={ETIQUETAS_SITUACION_PRESTAMO[p.situacion]} />
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Celda>

      {elegido && (
        <Celda titulo="Resumen del préstamo">
          <dl className={estilos.resumen}>
            <div>
              <dt>Pieza</dt>
              <dd>
                {elegido.piezaCodigo} · {elegido.piezaNombre}
              </dd>
            </div>
            <div>
              <dt>Institución destino</dt>
              <dd>{elegido.institucionDestino}</dd>
            </div>
            <div>
              <dt>Responsable que recibe</dt>
              <dd>{elegido.responsableReceptor}</dd>
            </div>
            <div>
              <dt>Fecha de salida</dt>
              <dd>{formatearFecha(elegido.fechaSalida)}</dd>
            </div>
            <div>
              <dt>Fecha de devolución prevista</dt>
              <dd>{formatearFecha(elegido.fechaDevolucionPrevista)}</dd>
            </div>
            <div>
              <dt>Estado al salir</dt>
              <dd>
                <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[elegido.estadoConservacionSalida]} />
              </dd>
            </div>
          </dl>
          <Formulario onSubmit={alEnviar}>
            <Campo etiqueta="Estado de conservación al regresar" htmlFor="estado" obligatorio>
              <Seleccion id="estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="">{MENSAJE_PRESTAMO_ESTADO_DEVOLUCION}</option>
                {ESTADOS_CONSERVACION.map((s) => (
                  <option key={s} value={s}>
                    {ETIQUETAS_ESTADO_CONSERVACION[s]}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            <Acciones>
              <Boton type="submit" disabled={enviando}>
                Confirmar devolución
              </Boton>
              <BotonEnlace href="/prestamos">Cancelar</BotonEnlace>
            </Acciones>
          </Formulario>
        </Celda>
      )}
    </div>
  );
}
