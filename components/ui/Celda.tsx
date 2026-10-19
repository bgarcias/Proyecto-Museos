import type { ReactNode } from "react";
import estilos from "./Celda.module.css";

/** Celda con borde: cada sección y cada formulario va dentro de una. */
export default function Celda({
  titulo,
  etiqueta,
  children,
  estrecha,
  ancha,
}: {
  titulo?: string;
  etiqueta?: string;
  children: ReactNode;
  /** Limita el ancho a la medida de un formulario. */
  estrecha?: boolean;
  /** Limita el ancho a la medida de un formulario de dos columnas. En tablet y mobile vuelve al ancho estrecho. */
  ancha?: boolean;
}) {
  return (
    <section className={`${estilos.celda} ${estrecha ? estilos.estrecha : ""} ${ancha ? estilos.ancha : ""}`}>
      {(titulo || etiqueta) && (
        <header className={estilos.cabecera}>
          {etiqueta && <span className={estilos.etiqueta}>{etiqueta}</span>}
          {titulo && <h2>{titulo}</h2>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Encabezado de página: etiqueta pequeña, título condensado y acciones a la derecha. */
export function EncabezadoPagina({
  etiqueta,
  titulo,
  acciones,
}: {
  etiqueta?: string;
  titulo: string;
  acciones?: ReactNode;
}) {
  return (
    <header className={estilos.encabezado}>
      <div className={estilos.cabecera}>
        {etiqueta && <span className={estilos.etiqueta}>{etiqueta}</span>}
        <h1>{titulo}</h1>
      </div>
      {acciones && <div className={estilos.acciones}>{acciones}</div>}
    </header>
  );
}

/** Fila de botones. */
export function Acciones({ children }: { children: ReactNode }) {
  return <div className={estilos.acciones}>{children}</div>;
}
