"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesionAccion } from "@/lib/controllers/CC_Usuario";
import { opcionesDeNavegacion } from "@/lib/navegacion";
import estilos from "./Navbar.module.css";

/** Menú de navegación fijo: celdas separadas por bordes, con la opción activa en amarillo. */
export default function Navbar({ nombre, esAdministrador }: { nombre: string; esAdministrador: boolean }) {
  const ruta = usePathname();
  const enlaces = opcionesDeNavegacion(esAdministrador);

  return (
    <nav className={estilos.barra} aria-label="Navegación principal">
      <Link href="/" className={`${estilos.celda} ${estilos.marca}`}>
        VESTIGIO
      </Link>
      {enlaces.map((e) => {
        const activo = ruta === e.href || ruta.startsWith(`${e.href}/`);
        return (
          <Link
            key={e.href}
            href={e.href}
            className={`${estilos.celda} ${estilos.enlace} ${activo ? estilos.activo : ""}`}
            aria-current={activo ? "page" : undefined}
          >
            {e.texto}
          </Link>
        );
      })}
      <div className={`${estilos.celda} ${estilos.usuario}`}>
        <span className={estilos.etiqueta}>Sesión</span>
        <span className={estilos.nombre}>{nombre}</span>
      </div>
      <form action={cerrarSesionAccion} className={estilos.salir}>
        <button type="submit" className={`${estilos.celda} ${estilos.boton}`}>
          Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
