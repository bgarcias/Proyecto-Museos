import type { ReactNode } from "react";
import estilos from "./Tabla.module.css";

/**
 * Tabla con líneas negras y cabecera en mayúsculas. Se usa con thead, tbody, tr, th y td normales.
 * Una fila con data-seleccionada="true" se resalta en amarillo. Con `clase` se agregan reglas propias a una sola tabla.
 */
export default function Tabla({ children, resumen, clase }: { children: ReactNode; resumen?: string; clase?: string }) {
  return (
    <div className={estilos.contenedor}>
      <table className={`${estilos.tabla} ${clase ?? ""}`} aria-label={resumen}>
        {children}
      </table>
    </div>
  );
}
