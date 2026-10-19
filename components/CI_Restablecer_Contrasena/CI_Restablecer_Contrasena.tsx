"use client";

import { useState } from "react";
import Link from "next/link";
import { definirNuevaContrasena } from "@/lib/controllers/CC_Usuario";
import { errorDeLongitudContrasena } from "@/lib/validaciones";
import { alertaError } from "@/components/ui/alertas";
import Boton from "@/components/ui/Boton";
import { Campo, Formulario } from "@/components/ui/Campo";
import CampoContrasena from "@/components/ui/CampoContrasena";
import PantallaAcceso from "@/components/ui/PantallaAcceso";
import estilos from "./CI_Restablecer_Contrasena.module.css";

/** Definir una nueva contraseña. Solo interfaz: no modifica ninguna contraseña. */
export default function CI_Restablecer_Contrasena() {
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
    const resultado = await definirNuevaContrasena(nueva, confirmacion);
    // Con datos válidos tampoco se modifica nada: el controlador avisa que la función se activará más adelante.
    if (!resultado.ok) alertaError(resultado.error);
    setEnviando(false);
  }

  return (
    <PantallaAcceso etiqueta="Acceso" titulo="Nueva contraseña">
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
          Guardar contraseña
        </Boton>
        <div className={estilos.enlaces}>
          <Link href="/login">Volver al inicio de sesión</Link>
        </div>
      </Formulario>
    </PantallaAcceso>
  );
}
