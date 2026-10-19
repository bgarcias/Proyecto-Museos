import type { ReactNode } from "react";
import estilos from "./Mensaje.module.css";

/** Mensaje junto a la acción: éxito en bloque verde, error en rojo y aviso neutro en gris. */
export default function Mensaje({ tipo, children }: { tipo: "exito" | "error" | "neutro"; children: ReactNode }) {
  return (
    <div className={`${estilos.mensaje} ${estilos[tipo]}`} role={tipo === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
