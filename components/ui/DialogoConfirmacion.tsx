"use client";

import type { ReactNode } from "react";
import Boton from "./Boton";
import Ventana from "./Ventana";

/** Ventana angosta de confirmación, con los botones Confirmar y Cancelar. */
export default function DialogoConfirmacion({
  titulo,
  children,
  procesando,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  children: ReactNode;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Ventana
      titulo={titulo}
      dialogo
      onCerrar={onCancelar}
      pie={
        <>
          <Boton variante="secundario" onClick={onCancelar}>
            Cancelar
          </Boton>
          <Boton onClick={onConfirmar} disabled={procesando}>
            Confirmar
          </Boton>
        </>
      }
    >
      <p>{children}</p>
    </Ventana>
  );
}
