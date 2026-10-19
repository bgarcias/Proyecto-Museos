import type { ReactNode } from "react";
import Celda from "./Celda";
import estilos from "./PantallaAcceso.module.css";

/**
 * Pantalla pública de acceso (login y recuperación de contraseña): logotipo y tarjeta forman un bloque
 * centrado en horizontal y en vertical, con el logotipo del ancho de la tarjeta.
 */
export default function PantallaAcceso({
  etiqueta,
  titulo,
  children,
}: {
  etiqueta?: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className={estilos.pantalla}>
      <div className={estilos.bloque}>
        <h1 className={estilos.marca}>VESTIGIO</h1>
        <Celda etiqueta={etiqueta} titulo={titulo}>
          {children}
        </Celda>
      </div>
    </div>
  );
}
