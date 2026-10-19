"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Entrada } from "./Campo";
import estilos from "./CampoContrasena.module.css";

/**
 * Campo de contraseña con un botón dentro del campo que alterna entre ocultar y mostrar el texto.
 * Recibe las mismas propiedades que un campo de texto, salvo el tipo.
 */
export default function CampoContrasena(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={estilos.contenedor}>
      <Entrada {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className={estilos.boton}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
