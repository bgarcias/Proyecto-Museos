import { MENSAJE_CODIGO_ANTERIOR_LARGO, MENSAJE_CODIGO_ANTERIOR_REPETIDO } from "../codigos";
import {
  MENSAJE_CONVENIO_LARGO,
  MENSAJE_INSTITUCION_LARGA,
  MENSAJE_POLIZA_LARGA,
  MENSAJE_RESPONSABLE_LARGO,
} from "../constantes";
import { MENSAJE_ANIO_RANGO, MENSAJE_VALOR_ASEGURADO } from "../validaciones";

/** Error de la capa de datos con un mensaje en español listo para mostrar. Nunca lleva texto técnico de la base. */
export class ErrorDatos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorDatos";
  }
}

/* Mensajes que los controladores ya producen. Se repiten aquí con el mismo texto porque en ellos son privados. */
export const MENSAJES = {
  correoRegistrado: "Este correo ya se encuentra registrado",
  museoDuplicado: "Ya existe un museo con ese nombre",
  inventarioEnCurso: "Ya existe un inventario en curso para este museo",
  inventarioCerrado: "No es posible modificar un inventario cerrado",
  prestamoNoDisponible: "La pieza no está disponible en las fechas indicadas",
  prestamoSinVigentes: "No existen préstamos vigentes",
  prestamoFechas: "Complete todos los campos y verifique que la fecha de devolución sea posterior a la fecha de salida",
  exposicionFechas: "La fecha de fin debe ser posterior a la fecha de inicio",
  exposicionConflicto: "Las siguientes piezas no pueden asignarse a la exposición",
  generico: "No se pudo completar la operación. Intenta de nuevo",
} as const;

/** Restricciones de prisma/sql con su mensaje. El nombre se busca dentro del texto del error de la base. */
const RESTRICCIONES: [string, string][] = [
  ["usuario_email_unico", MENSAJES.correoRegistrado],
  ["museo_organizacion_nombre_unico", MENSAJES.museoDuplicado],
  ["pieza_museo_codigo_anterior_unico", MENSAJE_CODIGO_ANTERIOR_REPETIDO],
  ["inventario_en_curso_unico", MENSAJES.inventarioEnCurso],
  ["prestamo_abierto_unico", MENSAJES.prestamoNoDisponible],
  ["pieza_anio_check", MENSAJE_ANIO_RANGO],
  ["pieza_codigo_anterior_check", MENSAJE_CODIGO_ANTERIOR_LARGO],
  ["prestamo_valor_asegurado_check", MENSAJE_VALOR_ASEGURADO],
  ["prestamo_institucion_destino_check", MENSAJE_INSTITUCION_LARGA],
  ["prestamo_responsable_receptor_check", MENSAJE_RESPONSABLE_LARGO],
  ["prestamo_numero_convenio_check", MENSAJE_CONVENIO_LARGO],
  ["prestamo_numero_poliza_check", MENSAJE_POLIZA_LARGA],
  ["exposicion_check", MENSAJES.exposicionFechas],
  ["prestamo_check", MENSAJES.prestamoFechas],
];

/** Todo el texto que pueda traer un error de Prisma o del controlador pg, para buscar nombres de restricción. */
function textoDelError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error ?? "");
  const e = error as { message?: unknown; meta?: unknown; cause?: unknown };
  let meta = "";
  try {
    meta = JSON.stringify(e.meta ?? "");
  } catch {
    meta = "";
  }
  const causa = e.cause && typeof e.cause === "object" ? textoDelError(e.cause) : "";
  return `${typeof e.message === "string" ? e.message : ""} ${meta} ${causa}`;
}

/** True si el error es la violación de la restricción con ese nombre. */
export function esRestriccion(error: unknown, nombre: string): boolean {
  return textoDelError(error).includes(nombre);
}

/** Traduce un error de la base a un ErrorDatos. Los que ya son ErrorDatos pasan tal cual. */
export function traducirError(error: unknown): ErrorDatos {
  if (error instanceof ErrorDatos) return error;
  const texto = textoDelError(error);
  // Las restricciones con nombre propio primero: prestamo_check1 no debe confundirse con prestamo_check
  const coincidencias = RESTRICCIONES.filter(([nombre]) => texto.includes(nombre));
  const exacta = coincidencias.find(([nombre]) => !new RegExp(`${nombre}\\d`).test(texto));
  if (exacta) return new ErrorDatos(exacta[1]);
  // Solo el tipo y el código llegan al registro del servidor, nunca el texto de la base
  const e = (error ?? {}) as { name?: unknown; code?: unknown };
  console.error(`Error de la base de datos: ${String(e.name ?? "Error")} ${String(e.code ?? "")}`.trim());
  return new ErrorDatos(MENSAJES.generico);
}

/** Ejecuta una operación y traduce sus errores. */
export async function traducir<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    throw traducirError(error);
  }
}
