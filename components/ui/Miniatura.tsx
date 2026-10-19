import { IMAGEN_MARCADOR } from "@/lib/constantes";
import estilos from "./Miniatura.module.css";

/** Imagen de una pieza. Si no tiene, muestra el marcador de posición neutro. */
export default function Miniatura({
  src,
  alt,
  tamano = "pequena",
}: {
  src?: string;
  alt: string;
  /** pequena: listas dentro de formularios. seleccion: ventanas de selección de piezas. lista: catálogo. grande: historial. detalle: pantalla de detalle. */
  tamano?: "pequena" | "seleccion" | "lista" | "grande" | "detalle";
}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src || IMAGEN_MARCADOR} alt={alt} className={`${estilos.imagen} ${estilos[tamano]}`} />;
}
