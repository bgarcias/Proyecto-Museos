"use client";

import type { ReactNode } from "react";
import Popup from "./Popup";

/** Popup con el ancho de los de selección de piezas. */
export default function PopupSeleccion({
  titulo,
  onCerrar,
  children,
  pie,
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <Popup seleccion titulo={titulo} onCerrar={onCerrar} pie={pie}>
      {children}
    </Popup>
  );
}
