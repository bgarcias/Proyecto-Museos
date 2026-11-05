"use client";

import { useState } from "react";
import { IMAGEN_MARCADOR } from "@/lib/constantes";
import { urlImagenPieza } from "@/lib/imagenes";
import estilos from "./Miniatura.module.css";

/** Lado en píxeles declarado en la imagen para reservar su espacio. El ancho real lo fija la hoja de estilos de cada tamaño. */
const LADO_DECLARADO = 160;

/** Imagen de una pieza. Sin imagen, o si la imagen no carga, muestra el marcador neutro. */
export default function Miniatura({
  src,
  alt,
  tamano = "pequena",
}: {
  /** Lo guardado en imagen_url: nombre de archivo del bucket, o una imagen antigua como data URL. */
  src?: string;
  alt: string;
  /** pequena: listas en formularios. seleccion: popups de selección. lista: catálogo. grande: historial. detalle: pantalla de detalle. */
  tamano?: "pequena" | "seleccion" | "lista" | "grande" | "detalle";
}) {
  const url = urlImagenPieza(src);
  // Guarda la dirección que falló: si la pieza cambia de imagen, se vuelve a intentar con la nueva
  const [fallida, setFallida] = useState<string>();
  const direccion = url && fallida !== url ? url : IMAGEN_MARCADOR;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={direccion}
      alt={alt}
      width={LADO_DECLARADO}
      height={LADO_DECLARADO}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (url) setFallida(url);
      }}
      className={`${estilos.imagen} ${estilos[tamano]}`}
    />
  );
}
