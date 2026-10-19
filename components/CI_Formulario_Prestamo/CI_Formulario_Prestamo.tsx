"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registrarPrestamo } from "@/lib/controllers/CC_Prestamo";
import {
  ETIQUETAS_ESTADO_CONSERVACION,
  MAXIMO_INSTITUCION_DESTINO,
  MAXIMO_NUMERO_CONVENIO,
  MAXIMO_NUMERO_POLIZA,
  MAXIMO_RESPONSABLE_RECEPTOR,
  MENSAJE_PRESTAMO_DEVOLUCION_LIMITE,
  MENSAJE_PRESTAMO_SALIDA_FUTURA,
  ETIQUETA_ESTADO_CONSERVACION,
} from "@/lib/constantes";
import type { Categoria, Museo, PiezaListado } from "@/lib/tipos";
import { VALOR_ASEGURADO_MAXIMO, VALOR_ASEGURADO_MINIMO, validarValorAsegurado } from "@/lib/validaciones";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import BuscadorPiezas from "@/components/ui/BuscadorPiezas";
import { Campo, DatoLectura, Entrada, Formulario } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import PopupSeleccion from "@/components/ui/PopupSeleccion";
import estilos from "./CI_Formulario_Prestamo.module.css";

export default function CI_Formulario_Prestamo({
  museos,
  categorias,
  hoy,
  limite,
}: {
  museos: Museo[];
  categorias: Categoria[];
  /** Fecha de hoy del servidor: la fecha de salida parte de ella. */
  hoy: string;
  /** Última fecha permitida para la devolución prevista, calculada en el servidor. */
  limite: string;
}) {
  const router = useRouter();
  const [institucionDestino, setInstitucionDestino] = useState("");
  const [responsableReceptor, setResponsableReceptor] = useState("");
  const [numeroConvenio, setNumeroConvenio] = useState("");
  const [numeroPoliza, setNumeroPoliza] = useState("");
  const [valorAsegurado, setValorAsegurado] = useState("");
  const [fechaSalida, setFechaSalida] = useState(hoy);
  const [fechaDevolucionPrevista, setFechaDevolucionPrevista] = useState("");
  const [pieza, setPieza] = useState<PiezaListado | null>(null);
  const [popupAbierto, setPopupAbierto] = useState(false);
  const [temporal, setTemporal] = useState<PiezaListado | null>(null);
  const [enviando, setEnviando] = useState(false);

  /** Paso 4: "Seleccionar pieza" abre la búsqueda de piezas en selección única. */
  function seleccionarPieza() {
    setTemporal(pieza);
    setPopupAbierto(true);
  }

  /** Paso 6: se muestra la pieza elegida con su estado de conservación actual. */
  function confirmarPieza() {
    setPieza(temporal);
    setPopupAbierto(false);
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (fechaSalida > hoy) {
      alertaError(MENSAJE_PRESTAMO_SALIDA_FUTURA);
      return;
    }
    if (fechaDevolucionPrevista > limite) {
      alertaError(MENSAJE_PRESTAMO_DEVOLUCION_LIMITE);
      return;
    }
    const validacionValor = validarValorAsegurado(valorAsegurado);
    if (valorAsegurado.trim() !== "" && !validacionValor.ok) {
      alertaError(validacionValor.error);
      return;
    }
    setEnviando(true);
    const resultado = await registrarPrestamo({
      piezaId: pieza?.id ?? "",
      institucionDestino,
      responsableReceptor,
      numeroConvenio,
      numeroPoliza,
      valorAsegurado,
      fechaSalida,
      fechaDevolucionPrevista,
    });
    if (resultado.ok) {
      // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en el módulo de préstamos.
      alertaExito(resultado.mensaje ?? "");
      router.push("/prestamos");
      return;
    }
    alertaError(resultado.error);
    setEnviando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Préstamos" titulo="Nuevo préstamo" />
      <Celda estrecha>
        <Formulario onSubmit={alEnviar}>
          <Campo etiqueta="Institución destino" htmlFor="institucion" obligatorio>
            <Entrada id="institucion" maxLength={MAXIMO_INSTITUCION_DESTINO} value={institucionDestino} onChange={(e) => setInstitucionDestino(e.target.value)} />
          </Campo>
          <Campo etiqueta="Responsable que recibe" htmlFor="responsable" obligatorio>
            <Entrada id="responsable" maxLength={MAXIMO_RESPONSABLE_RECEPTOR} value={responsableReceptor} onChange={(e) => setResponsableReceptor(e.target.value)} />
          </Campo>
          <Campo etiqueta="Número de convenio" htmlFor="convenio" obligatorio>
            <Entrada id="convenio" maxLength={MAXIMO_NUMERO_CONVENIO} value={numeroConvenio} onChange={(e) => setNumeroConvenio(e.target.value)} />
          </Campo>
          <Campo etiqueta="Número de póliza" htmlFor="poliza" obligatorio>
            <Entrada id="poliza" maxLength={MAXIMO_NUMERO_POLIZA} value={numeroPoliza} onChange={(e) => setNumeroPoliza(e.target.value)} />
          </Campo>
          <Campo etiqueta="Valor asegurado" htmlFor="valor" obligatorio>
            <Entrada
              id="valor"
              type="number"
              inputMode="decimal"
              min={VALOR_ASEGURADO_MINIMO}
              max={VALOR_ASEGURADO_MAXIMO}
              step="0.01"
              value={valorAsegurado}
              onChange={(e) => setValorAsegurado(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Fecha de salida" htmlFor="salida" obligatorio>
            <Entrada id="salida" type="date" max={hoy} value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} />
          </Campo>
          <Campo etiqueta="Fecha de devolución prevista" htmlFor="prevista" obligatorio>
            <Entrada
              id="prevista"
              type="date"
              max={limite}
              value={fechaDevolucionPrevista}
              onChange={(e) => setFechaDevolucionPrevista(e.target.value)}
            />
          </Campo>

          <div className={estilos.pieza}>
            <Acciones>
              <Boton variante="secundario" onClick={seleccionarPieza}>
                Seleccionar pieza
              </Boton>
              {pieza && (
                <Boton variante="secundario" onClick={() => setPieza(null)}>
                  Quitar
                </Boton>
              )}
            </Acciones>
            {pieza && (
              <>
                <DatoLectura etiqueta="Pieza">
                  <Miniatura src={pieza.imagenUrl} alt={`Imagen de ${pieza.nombre}`} />
                  &nbsp;{pieza.codigo} · {pieza.nombre}
                </DatoLectura>
                <DatoLectura etiqueta={ETIQUETA_ESTADO_CONSERVACION}>
                  <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[pieza.estadoConservacion]} />
                </DatoLectura>
              </>
            )}
          </div>

          <Acciones>
            <Boton type="submit" disabled={enviando}>
              Guardar
            </Boton>
            <BotonEnlace href="/prestamos">Cancelar</BotonEnlace>
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
              <Boton onClick={confirmarPieza} disabled={!temporal}>
                Seleccionar
              </Boton>
            </>
          }
        >
          <BuscadorPiezas
            modo="seleccion-unica"
            museos={museos}
            categorias={categorias}
            seleccionadas={temporal ? [temporal.id] : []}
            onAlternar={setTemporal}
          />
        </PopupSeleccion>
      )}
    </div>
  );
}
