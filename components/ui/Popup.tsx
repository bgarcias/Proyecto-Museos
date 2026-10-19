"use client";

import { useEffect, type ReactNode } from "react";
import Boton from "./Boton";
import estilos from "./Popup.module.css";

/** Popup base. Todos comparten diseño: título, contenido y botones al pie. */
export default function Popup({
  titulo,
  onCerrar,
  children,
  pie,
  angosto,
  seleccion,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  /** Versión angosta, para popups de confirmación. */
  angosto?: boolean;
  /** Ancho de los popups de selección de piezas. */
  seleccion?: boolean;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  return (
    <div className={estilos.velo} onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`${estilos.popup} ${angosto ? estilos.angosto : ""} ${seleccion ? estilos.seleccion : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <header className={estilos.cabecera}>
          <h2>{titulo}</h2>
          <Boton variante="secundario" pequeno onClick={onCerrar} aria-label="Cerrar ventana">
            Cerrar
          </Boton>
        </header>
        <div className={estilos.cuerpo}>{children}</div>
        {pie && <footer className={estilos.pie}>{pie}</footer>}
      </div>
    </div>
  );
}
