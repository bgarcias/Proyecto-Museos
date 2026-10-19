"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import estilos from "./ContenedorAlertas.module.css";

/**
 * Monta el Toaster de Sonner. Se usa una sola vez, en app/layout.tsx, para que las alertas sobrevivan a la navegación.
 * El tamaño y los colores salen de las variables globales (escala, ancho, éxito y error).
 */
export default function ContenedorAlertas() {
  const estiloAncho = { "--width": "calc(var(--alerta-ancho) * var(--escala-alertas))" } as CSSProperties;
  return <Toaster className={estilos.alertas} style={estiloAncho} />;
}
