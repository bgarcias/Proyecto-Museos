"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cerrarSesionAccion } from "@/lib/controllers/CC_Usuario";
import { CONSULTA_MENU_COMPACTO, ETIQUETA_ABRIR_MENU, ETIQUETA_CERRAR_MENU } from "@/lib/constantes";
import { opcionesDeNavegacion } from "@/lib/navegacion";
import estilos from "./Navbar.module.css";

const ID_PANEL = "menu-navegacion";

/** Barra de navegación de la parte superior: celdas con borde y la opción activa en amarillo. En pantallas compactas las opciones van tras un botón. */
export default function Navbar({ nombre, esAdministrador }: { nombre: string; esAdministrador: boolean }) {
  const ruta = usePathname();
  const enlaces = opcionesDeNavegacion(esAdministrador);
  // Se guarda la ruta en que se abrió: al navegar a otra deja de coincidir y el menú queda cerrado.
  const [rutaAbierta, setRutaAbierta] = useState<string | null>(null);
  const abierto = rutaAbierta === ruta;
  const cerrar = () => setRutaAbierta(null);

  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  // Al pasar a escritorio se cierra, para que no reaparezca abierto al volver a una pantalla compacta.
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_MENU_COMPACTO);
    const alCambiar = () => {
      if (!consulta.matches) cerrar();
    };
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);

  return (
    <nav className={estilos.barra} aria-label="Navegación principal">
      <div className={estilos.cabecera}>
        <Link href="/" className={`${estilos.celda} ${estilos.marca}`} onClick={cerrar}>
          VESTIGIO
        </Link>
        <button
          type="button"
          className={`${estilos.celda} ${estilos.hamburguesa} ${abierto ? estilos.abierta : ""}`}
          aria-label={abierto ? ETIQUETA_CERRAR_MENU : ETIQUETA_ABRIR_MENU}
          aria-expanded={abierto}
          aria-controls={ID_PANEL}
          onClick={() => setRutaAbierta(abierto ? null : ruta)}
        >
          <span className={estilos.linea} />
          <span className={estilos.linea} />
          <span className={estilos.linea} />
        </button>
      </div>
      <div id={ID_PANEL} className={`${estilos.panel} ${abierto ? estilos.panelAbierto : ""}`}>
        {enlaces.map((e) => {
          const activo = ruta === e.href || ruta.startsWith(`${e.href}/`);
          return (
            <Link
              key={e.href}
              href={e.href}
              className={`${estilos.celda} ${estilos.enlace} ${activo ? estilos.activo : ""}`}
              aria-current={activo ? "page" : undefined}
              onClick={cerrar}
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
      </div>
    </nav>
  );
}
