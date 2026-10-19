"use client";

import { toast } from "sonner";

/*
 * Alertas centrales: las pantallas usan estas dos funciones y no llaman a Sonner directamente.
 * Lo que debe quedar visible dentro de la pantalla va en components/ui/Mensaje.tsx.
 *
 * Solo hay una alerta vigente a la vez, de éxito o de error y en cualquier pantalla. Cada una tiene su propio id:
 * al lanzar una nueva se descarta la anterior por su id (sale animada) y la nueva entra con su animación normal.
 *
 * Si una acción guarda y navega, la alerta se dispara antes de navegar: el Toaster vive en el layout raíz
 * y sigue visible tras la redirección.
 */

let contador = 0;
let idUltima: string | null = null;

/** Descarta la última alerta y devuelve el id de la nueva. */
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
