"use client";

import { toast } from "sonner";

/*
 * Helper central de alertas. Las pantallas usan estas dos funciones y no llaman a Sonner directamente.
 * Para mensajes que deben quedar visibles dentro de la pantalla se usa components/ui/Mensaje.tsx.
 *
 * Solo hay una alerta vigente a la vez, sea de éxito o de error y sin importar la pantalla.
 * Cada alerta tiene su propio id: al lanzar una nueva se descarta la anterior por su id, que hace su
 * salida animada, y la nueva entra con su animación de entrada normal.
 *
 * Si una acción guarda y luego navega a otra pantalla, la alerta se dispara antes de navegar:
 * el Toaster vive en el layout raíz, así que sigue visible tras la redirección.
 */

let contador = 0;
let idUltima: string | null = null;

/** Descarta la última alerta lanzada y devuelve el id propio de la nueva. */
function nuevoId(): string {
  if (idUltima !== null) toast.dismiss(idUltima);
  idUltima = `alerta-${++contador}`;
  return idUltima;
}

export function alertaExito(mensaje: string): void {
  toast.success(mensaje, { id: nuevoId() });
}

export function alertaError(mensaje: string): void {
  toast.error(mensaje, { id: nuevoId() });
}
