"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import estilos from "./template.module.css";

// La key es la ruta completa: se vuelve a montar (y anima) en cada cambio de dirección, a cualquier nivel.
// Los parámetros de búsqueda y router.refresh no cambian la ruta, así que no animan.
export default function Template({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  return (
    <div key={ruta} className={estilos.entrada}>
      {children}
    </div>
  );
}
