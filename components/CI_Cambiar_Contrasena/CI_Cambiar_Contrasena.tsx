"use client";

import { useState } from "react";
import { cambiarContrasena } from "@/lib/controllers/CC_Usuario";
import Boton from "@/components/ui/Boton";
import { Campo, Formulario } from "@/components/ui/Campo";
import CampoContrasena from "@/components/ui/CampoContrasena";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import estilos from "./CI_Cambiar_Contrasena.module.css";
import { errorDeLongitudContrasena } from "@/lib/validaciones";
import { alertaError } from "@/components/ui/alertas";

export default function CI_Cambiar_Contrasena({ nombre }: { nombre: string }) {
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errorLongitud = errorDeLongitudContrasena(nueva);
    if (errorLongitud) {
      alertaError(errorLongitud);
      return;
    }
    setEnviando(true);
    const resultado = await cambiarContrasena(nueva, confirmacion);
    // Si el cambio es correcto, el controlador redirige al inicio.
    if (resultado && !resultado.ok) alertaError(resultado.error);
    setEnviando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta={nombre} titulo="Cambiar contraseña" />
      <Celda estrecha>
        <Formulario onSubmit={alEnviar}>
          <Campo etiqueta="Nueva contraseña" htmlFor="nueva">
            <CampoContrasena
              id="nueva"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
            />
          </Campo>
          <Campo etiqueta="Confirmar contraseña" htmlFor="confirmacion">
            <CampoContrasena
              id="confirmacion"
              autoComplete="new-password"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
            />
          </Campo>
          <Boton type="submit" disabled={enviando}>
            Guardar
          </Boton>
        </Formulario>
      </Celda>
    </div>
  );
}
