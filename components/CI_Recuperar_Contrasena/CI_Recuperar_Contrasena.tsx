"use client";

import { useState } from "react";
import Link from "next/link";
import { solicitarRecuperacion } from "@/lib/controllers/CC_Usuario";
import { errorDeCorreo } from "@/lib/validaciones";
import Boton from "@/components/ui/Boton";
import { Campo, Entrada, Formulario } from "@/components/ui/Campo";
import Mensaje from "@/components/ui/Mensaje";
import PantallaAcceso from "@/components/ui/PantallaAcceso";
import estilos from "./CI_Recuperar_Contrasena.module.css";

/** Solicitar recuperación de contraseña. Solo interfaz: no consulta usuarios ni envía nada. */
export default function CI_Recuperar_Contrasena() {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje("");
    // La vista avisa de inmediato. El controlador repite la misma validación.
    const local = errorDeCorreo(correo);
    if (local) {
      setError(local);
      return;
    }
    setError(undefined);
    setEnviando(true);
    const resultado = await solicitarRecuperacion(correo);
    if (resultado.ok) setMensaje(resultado.mensaje ?? "");
    else setError(resultado.errores?.correo);
    setEnviando(false);
  }

  return (
    <PantallaAcceso etiqueta="Acceso" titulo="Recuperar contraseña">
      <Formulario onSubmit={alEnviar}>
        <Campo etiqueta="Correo electrónico" htmlFor="correo" error={error}>
          <Entrada
            id="correo"
            type="email"
            autoComplete="username"
            value={correo}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "correo-error" : undefined}
            onChange={(e) => {
              setCorreo(e.target.value);
              setError(undefined);
            }}
          />
        </Campo>
        {mensaje && <Mensaje tipo="neutro">{mensaje}</Mensaje>}
        <Boton type="submit" disabled={enviando}>
          Enviar enlace
        </Boton>
        <div className={estilos.enlaces}>
          <Link href="/login">Volver al inicio de sesión</Link>
        </div>
      </Formulario>
    </PantallaAcceso>
  );
}
