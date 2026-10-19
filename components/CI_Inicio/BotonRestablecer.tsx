"use client";

import { useState } from "react";
import { restablecerDatosDemostracion } from "@/lib/controllers/CC_Usuario";
import Boton from "@/components/ui/Boton";
import { alertaError, alertaExito } from "@/components/ui/alertas";

export default function BotonRestablecer() {
  const [enviando, setEnviando] = useState(false);

  async function restablecer() {
    setEnviando(true);
    const resultado = await restablecerDatosDemostracion();
    if (resultado.ok) alertaExito(resultado.mensaje ?? "");
    else alertaError(resultado.error);
    setEnviando(false);
  }

  return (
    <div>
      <Boton variante="secundario" onClick={restablecer} disabled={enviando}>
        Restablecer datos de demostración
      </Boton>
    </div>
  );
}
