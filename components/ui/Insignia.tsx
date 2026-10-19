import estilos from "./Insignia.module.css";

/*
 * Estilo unificado de todas las insignias de estado, resuelto aquí y no pantalla por pantalla.
 * Todas llevan el borde grueso del proyecto. El color depende del significado del estado:
 *   verde: algo en buen estado o activo; amarillo: en proceso o con atención;
 *   rojo: problema o alerta; gris: concluido o inactivo; solo borde: aún no empieza.
 */
type Color = "verde" | "amarillo" | "rojo" | "gris" | "borde";

const COLORES: Record<string, Color> = {
  // verde
  activo: "verde",
  bueno: "verde",
  disponible: "verde",
  vigente: "verde",
  encontrada: "verde",
  "en exhibición": "verde",
  // amarillo
  regular: "amarillo",
  "en préstamo": "amarillo",
  "en curso": "amarillo",
  "con daño": "amarillo",
  // rojo
  malo: "rojo",
  vencido: "rojo",
  cancelada: "rojo",
  "no encontrada": "rojo",
  "pendiente de verificación": "rojo",
  // gris
  inactivo: "gris",
  finalizada: "gris",
  cerrado: "gris",
  devuelto: "gris",
  "en almacén": "gris",
  // solo borde, sin relleno
  programada: "borde",
};

/** Insignia rectangular con borde para estados. Un estado que no esté en la lista recibe el gris. */
export default function Insignia({ valor }: { valor?: string }) {
  const texto = valor ?? "Sin estado";
  const color = COLORES[texto.toLowerCase()] ?? "gris";
  return <span className={`${estilos.insignia} ${estilos[color]}`}>{texto}</span>;
}
