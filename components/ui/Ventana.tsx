"use client";

import { useEffect, type ReactNode } from "react";
import Boton from "./Boton";
import estilos from "./Ventana.module.css";

/** Ventana emergente. Todas comparten el mismo diseño: título, contenido y botones al pie. */
export default function Ventana({
  titulo,
  onCerrar,
  children,
  pie,
  dialogo,
  ancha,
  seleccion,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
  /** Versión angosta, para diálogos de confirmación. */
  dialogo?: boolean;
  /** Hasta el ancho útil del contenedor, para ventanas con tablas de muchas columnas. */
  ancha?: boolean;
  /** Ancho de las ventanas de selección de piezas. */
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
      <div className={`${estilos.ventana} ${dialogo ? estilos.dialogo : ""} ${ancha ? estilos.ancha : ""} ${seleccion ? estilos.seleccion : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
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
