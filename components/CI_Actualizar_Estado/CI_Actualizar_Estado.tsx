"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstado } from "@/lib/controllers/CC_Pieza";
import { ESTADOS_CONSERVACION, ETIQUETAS_ESTADO_CONSERVACION } from "@/lib/constantes";
import type { PiezaListado } from "@/lib/tipos";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { Campo, DatoLectura, Formulario, Seleccion } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import estilos from "./CI_Actualizar_Estado.module.css";
import { alertaError, alertaExito } from "@/components/ui/alertas";

export default function CI_Actualizar_Estado({ pieza }: { pieza: PiezaListado }) {
  const router = useRouter();
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const resultado = await actualizarEstado(pieza.id, nuevoEstado);
    if (!resultado.ok) {
      alertaError(resultado.error);
      setEnviando(false);
      return;
    }
    // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en el catálogo.
    alertaExito(resultado.mensaje ?? "");
    router.push("/piezas");
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Piezas" titulo="Actualizar estado de conservación" />
      <Celda estrecha>
        <div className={estilos.pieza}>
          <Miniatura src={pieza.imagenUrl} alt={`Imagen de ${pieza.nombre}`} tamano="grande" />
          <h2>{pieza.nombre}</h2>
        </div>
        <Formulario onSubmit={alEnviar}>
          <DatoLectura etiqueta="Estado actual">
            <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[pieza.estadoConservacion]} />
          </DatoLectura>
          <Campo etiqueta="Nuevo estado" htmlFor="nuevo-estado" obligatorio>
            <Seleccion id="nuevo-estado" value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
              <option value="">Selecciona un estado</option>
              {ESTADOS_CONSERVACION.map((s) => (
                <option key={s} value={s}>
                  {ETIQUETAS_ESTADO_CONSERVACION[s]}
                </option>
              ))}
            </Seleccion>
          </Campo>
          <Acciones>
            <Boton type="submit" disabled={enviando}>
              Guardar
            </Boton>
            <BotonEnlace href="/piezas">Volver</BotonEnlace>
          </Acciones>
        </Formulario>
      </Celda>
    </div>
  );
}
