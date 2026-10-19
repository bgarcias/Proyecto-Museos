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
  /** Ancho completo, con altura mínima común. El texto puede partirse en dos líneas. */
  bloque?: boolean;
  /** Con `bloque`: menos relleno y letra menor, para pilas de botones en una fila de tabla. */
  compacto?: boolean;
};

/**
 * Botón común. Principal (relleno), secundario (solo borde) y de peligro (rojo, sin relleno),
 * para acciones como desactivar o cancelar.
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
  /** Como en `Boton`: ancho completo y altura mínima común. */
  bloque?: boolean;
  /** Igual que en `Boton`. */
  compacto?: boolean;
  /** Descarga un archivo: enlace normal, no la navegación de Next. */
  descarga?: boolean;
  /** Abre en pestaña nueva (por ejemplo un PDF). */
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
