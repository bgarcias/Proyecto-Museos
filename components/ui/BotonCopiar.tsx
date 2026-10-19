"use client";

import { useEffect, useRef, useState } from "react";
import { alertaError } from "./alertas";
import Boton from "./Boton";

const MILISEGUNDOS_COPIADA = 2500;

/**
 * Copia un texto al portapapeles. Muestra "Copiada" unos segundos y vuelve a "Copiar".
 * El éxito no lanza alerta. Si el navegador no deja copiar, sale una alerta de error.
 */
export default function BotonCopiar({ texto }: { texto: string }) {
  const [copiada, setCopiada] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      alertaError("No se pudo copiar al portapapeles");
      return;
    }
    setCopiada(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiada(false), MILISEGUNDOS_COPIADA);
  }

  return (
    <Boton variante="secundario" pequeno onClick={copiar}>
      {copiada ? "Copiada" : "Copiar"}
    </Boton>
  );
}
