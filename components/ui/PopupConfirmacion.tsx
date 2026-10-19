"use client";

import type { ReactNode } from "react";
import Boton from "./Boton";
import Popup from "./Popup";

/** Popup angosto de confirmación, con los botones Confirmar y Cancelar. */
export default function PopupConfirmacion({
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
    <Popup
      titulo={titulo}
      angosto
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
    </Popup>
  );
}
