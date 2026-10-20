"use client";

import { useState } from "react";
import Link from "next/link";
import { ingresar } from "@/lib/controllers/CC_Usuario";
import type { DatosDemo } from "@/lib/tipos";
import { errorDeContrasenaIngreso, errorDeCorreo } from "@/lib/validaciones";
import { alertaError } from "@/components/ui/alertas";
import Boton from "@/components/ui/Boton";
import { Campo, Entrada, Formulario } from "@/components/ui/Campo";
import CampoContrasena from "@/components/ui/CampoContrasena";
import PantallaAcceso from "@/components/ui/PantallaAcceso";
import DesplegableDemo from "./DesplegableDemo";
import estilos from "./CI_Login.module.css";

type Errores = { correo?: string; contrasena?: string };

/** datosDemo solo llega con MOSTRAR_DATOS_DEMO en true: si es null no se muestra el recuadro. */
export default function CI_Login({ datosDemo }: { datosDemo?: DatosDemo | null }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // La vista avisa de inmediato. El controlador repite las mismas validaciones.
    const locales: Errores = { correo: errorDeCorreo(correo), contrasena: errorDeContrasenaIngreso(contrasena) };
    if (locales.correo || locales.contrasena) {
      setErrores(locales);
      return;
    }
    setErrores({});
    setEnviando(true);
    const resultado = await ingresar(correo, contrasena);
    // Si el ingreso es correcto, el controlador redirige y no se llega aquí.
    if (resultado && !resultado.ok) {
      if (resultado.errores) setErrores(resultado.errores);
      // Credenciales incorrectas (o cuenta desactivada): mensaje general, sin indicar qué campo falló
      if (resultado.error) alertaError(resultado.error);
    }
    setEnviando(false);
  }

  return (
    <PantallaAcceso etiqueta="Acceso" titulo="Iniciar sesión">
      <>
        <Formulario onSubmit={alEnviar}>
          <Campo etiqueta="Correo electrónico" htmlFor="correo" error={errores.correo}>
            <Entrada
              id="correo"
              type="email"
              autoComplete="username"
              value={correo}
              aria-invalid={Boolean(errores.correo)}
              aria-describedby={errores.correo ? "correo-error" : undefined}
              onChange={(e) => {
                setCorreo(e.target.value);
                setErrores((er) => ({ ...er, correo: undefined }));
              }}
            />
          </Campo>
          <Campo etiqueta="Contraseña" htmlFor="contrasena" error={errores.contrasena}>
            <CampoContrasena
              id="contrasena"
              autoComplete="current-password"
              value={contrasena}
              aria-invalid={Boolean(errores.contrasena)}
              aria-describedby={errores.contrasena ? "contrasena-error" : undefined}
              onChange={(e) => {
                setContrasena(e.target.value);
                setErrores((er) => ({ ...er, contrasena: undefined }));
              }}
            />
          </Campo>
          <Boton type="submit" disabled={enviando}>
            Ingresar
          </Boton>
          <div className={estilos.enlaces}>
            <Link href="/recuperar-contrasena">¿Olvidaste tu contraseña?</Link>
          </div>
        </Formulario>
        {datosDemo && <DesplegableDemo datos={datosDemo} />}
      </>
    </PantallaAcceso>
  );
}
