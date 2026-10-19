import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import estilos from "./Boton.module.css";

type Variante = "principal" | "secundario" | "peligro";

function clases(variante: Variante, pequeno?: boolean, bloque?: boolean, compacto?: boolean) {
  return [
    estilos.boton,
    estilos[variante],
    pequeno ? estilos.pequeno : "",
    bloque ? estilos.bloque : "",
    compacto ? estilos.compacto : "",
  ].join(" ");
}

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
  pequeno?: boolean;
  /** Ocupa todo el ancho de su contenedor, con altura mínima común y texto centrado que puede partirse en dos líneas. */
  bloque?: boolean;
  /** Con `bloque`: menos relleno vertical y letra menor, para pilas de botones dentro de una fila de tabla. */
  compacto?: boolean;
};

/**
 * Botón consistente en toda la aplicación: uno principal (relleno), uno secundario (solo borde) y
 * uno de peligro (texto y borde de error, sin relleno), para acciones como desactivar o cancelar.
 */
export default function Boton({ variante = "principal", pequeno, bloque, compacto, type = "button", className, ...resto }: BotonProps) {
  return <button type={type} className={`${clases(variante, pequeno, bloque, compacto)} ${className ?? ""}`} {...resto} />;
}

export function BotonEnlace({
  href,
  variante = "secundario",
  pequeno,
  bloque,
  compacto,
  descarga,
  nuevaPestana,
  children,
}: {
  href: string;
  variante?: Variante;
  pequeno?: boolean;
  /** Igual que en `Boton`: ancho completo del contenedor, con altura mínima común. */
  bloque?: boolean;
  /** Igual que en `Boton`. */
  compacto?: boolean;
  /** El enlace descarga un archivo: se usa un enlace normal y no la navegación de Next. */
  descarga?: boolean;
  /** El enlace abre en una pestaña nueva (por ejemplo, un PDF). */
  nuevaPestana?: boolean;
  children: ReactNode;
}) {
  if (descarga) {
    return (
      <a href={href} download className={clases(variante, pequeno, bloque, compacto)}>
        {children}
      </a>
    );
  }
  if (nuevaPestana) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={clases(variante, pequeno, bloque, compacto)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={clases(variante, pequeno, bloque, compacto)}>
      {children}
    </Link>
  );
}
