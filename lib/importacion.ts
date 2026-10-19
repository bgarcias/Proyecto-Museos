import ExcelJS from "exceljs";
import { MAXIMO_CODIGO_ANTERIOR, MENSAJE_CODIGO_ANTERIOR_LARGO, claveCodigoAnterior } from "./codigos";
import { ESTADOS_CONSERVACION, ETIQUETAS_ESTADO_CONSERVACION } from "./constantes";
import { MAXIMO_FILAS, MAXIMO_MEGABYTES_ARCHIVO } from "./limitesImportacion";
import { ANIO_MINIMO, anioEnRango, validarAnio } from "./validaciones";
import type { Categoria, EstadoConservacion } from "./tipos";

/*
 * Lectura, escritura y validación del Excel de importación de piezas.
 * No usa sesión ni datos: los controladores le pasan lo que necesita.
 */

export { MAXIMO_BYTES_ARCHIVO, MAXIMO_FILAS } from "./limitesImportacion";
export const NOMBRE_HOJA_PIEZAS = "Piezas";
export const NOMBRE_ARCHIVO_PLANTILLA = "plantilla-importacion-piezas.xlsx";

export const COLUMNAS_PLANTILLA = [
  "Nombre",
  "Categoría",
  "Descripción",
  "Año",
  "Material",
  "Estado de conservación",
  "Ubicación física",
  "Código anterior",
] as const;

const COLUMNAS_OBLIGATORIAS = ["Nombre", "Categoría", "Estado de conservación"];

/** Fila tal como viene del archivo, todo en texto. */
export type FilaCruda = {
  fila: number;
  nombre: string;
  categoria: string;
  descripcion: string;
  anio: string;
  material: string;
  estado: string;
  ubicacion: string;
  codigoAnterior: string;
};

/** Fila válida, ya convertida a los datos de una pieza. Es lo que viaja entre el servidor y la vista previa. */
export type FilaImportacion = {
  fila: number;
  nombre: string;
  categoriaId: string;
  categoriaNombre: string;
  descripcion?: string;
  anio?: number;
  material?: string;
  estadoConservacion: EstadoConservacion;
  ubicacionFisica?: string;
  codigoAnterior?: string;
};

export type ErrorFila = { fila: number; motivo: string };

export type VistaPreviaImportacion = {
  validas: FilaImportacion[];
  errores: ErrorFila[];
};

function normalizar(valor: string): string {
  return valor.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Texto de una celda, sea cual sea su tipo (texto, número, fecha, texto con formato o fórmula). */
function textoDeCelda(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") return String(valor);
  // Una celda de fecha de Excel es un día de calendario guardado como UTC: se toma su día sin desplazarlo por ninguna zona.
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    if (Array.isArray(objeto.richText)) {
      return (objeto.richText as { text: string }[]).map((r) => r.text).join("").trim();
    }
    if ("result" in objeto) return textoDeCelda(objeto.result);
    if ("text" in objeto) return textoDeCelda(objeto.text);
  }
  return "";
}

/** Genera el .xlsx de la plantilla: hoja "Piezas" solo con encabezados y hoja "Instrucciones". */
export async function generarArchivoPlantilla(categorias: Categoria[]): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();

  const piezas = libro.addWorksheet(NOMBRE_HOJA_PIEZAS);
  piezas.addRow([...COLUMNAS_PLANTILLA]);
  piezas.getRow(1).font = { bold: true };
  piezas.columns = COLUMNAS_PLANTILLA.map((nombre) => ({ width: Math.max(nombre.length + 4, 16) }));

  const instrucciones = libro.addWorksheet("Instrucciones");
  instrucciones.columns = [{ width: 60 }];
  const filas: string[] = [
    "Instrucciones",
    "Complete la hoja Piezas desde la fila 2. No cambie los encabezados de la fila 1.",
    "",
    "Columnas obligatorias",
    ...COLUMNAS_OBLIGATORIAS,
    "",
    "Categorías válidas",
    ...categorias.map((c) => c.nombre),
    "",
    "Estados de conservación válidos",
    ...ESTADOS_CONSERVACION.map((e) => ETIQUETAS_ESTADO_CONSERVACION[e]),
    "",
    `El año, si se indica, debe ser un número entero entre ${ANIO_MINIMO} y el año actual.`,
    `El código anterior es opcional, de máximo ${MAXIMO_CODIGO_ANTERIOR} caracteres. El sistema asigna el código de cada pieza.`,
    `El archivo debe ser .xlsx, de máximo ${MAXIMO_MEGABYTES_ARCHIVO} MB y de máximo ${MAXIMO_FILAS} filas.`,
  ];
  for (const f of filas) instrucciones.addRow([f]);
  for (const titulo of ["Instrucciones", "Columnas obligatorias", "Categorías válidas", "Estados de conservación válidos"]) {
    const fila = filas.indexOf(titulo) + 1;
    instrucciones.getRow(fila).font = { bold: true };
  }

  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

export type LecturaArchivo =
  | { ok: true; filas: FilaCruda[] }
  | { ok: false; motivo: "formato" | "demasiadas_filas" };

/** Lee el .xlsx. Los encabezados de la hoja Piezas deben coincidir con los de la plantilla. */
export async function leerArchivoPiezas(contenido: ArrayBuffer): Promise<LecturaArchivo> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(contenido);
  } catch {
    return { ok: false, motivo: "formato" };
  }
  const hoja = libro.getWorksheet(NOMBRE_HOJA_PIEZAS);
  if (!hoja) return { ok: false, motivo: "formato" };

  const encabezados = COLUMNAS_PLANTILLA.map((_, i) => normalizar(textoDeCelda(hoja.getRow(1).getCell(i + 1).value)));
  const coincide = COLUMNAS_PLANTILLA.every((nombre, i) => encabezados[i] === normalizar(nombre));
  if (!coincide) return { ok: false, motivo: "formato" };

  const filas: FilaCruda[] = [];
  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    if (numero === 1) return;
    const celdas = COLUMNAS_PLANTILLA.map((_, i) => textoDeCelda(fila.getCell(i + 1).value));
    if (celdas.every((c) => c === "")) return; // fila vacía
    filas.push({
      fila: numero,
      nombre: celdas[0],
      categoria: celdas[1],
      descripcion: celdas[2],
      anio: celdas[3],
      material: celdas[4],
      estado: celdas[5],
      ubicacion: celdas[6],
      codigoAnterior: celdas[7],
    });
  });
  if (filas.length > MAXIMO_FILAS) return { ok: false, motivo: "demasiadas_filas" };
  return { ok: true, filas };
}

/**
 * Valida cada fila: obligatorios completos, categoría existente, estado válido, año entero y,
 * solo si la celda tiene valor, código anterior de longitud permitida, no registrado en el museo y no repetido en el archivo.
 */
export function validarFilasPiezas(
  filas: FilaCruda[],
  categorias: Categoria[],
  codigosAnterioresDelMuseo: Set<string>,
): VistaPreviaImportacion {
  const validas: FilaImportacion[] = [];
  const errores: ErrorFila[] = [];
  const codigosVistos = new Map<string, number>(); // código anterior normalizado -> fila donde apareció primero

  for (const f of filas) {
    const motivos: string[] = [];
    if (!f.nombre) motivos.push("Falta el nombre");
    if (!f.categoria) motivos.push("Falta la categoría");
    if (!f.estado) motivos.push("Falta el estado de conservación");

    const categoria = f.categoria
      ? categorias.find((c) => normalizar(c.nombre) === normalizar(f.categoria))
      : undefined;
    if (f.categoria && !categoria) motivos.push(`La categoría "${f.categoria}" no existe`);

    const estado = f.estado
      ? ESTADOS_CONSERVACION.find((e) => e === normalizar(f.estado))
      : undefined;
    if (f.estado && !estado) motivos.push(`El estado "${f.estado}" no es válido (Bueno, Regular o Malo)`);

    const validacionAnio = validarAnio(f.anio);
    if (!validacionAnio.ok) motivos.push(validacionAnio.error);
    const anio = validacionAnio.ok ? validacionAnio.anio : undefined;

    if (f.codigoAnterior) {
      if (f.codigoAnterior.length > MAXIMO_CODIGO_ANTERIOR) {
        motivos.push(MENSAJE_CODIGO_ANTERIOR_LARGO);
      } else {
        const clave = claveCodigoAnterior(f.codigoAnterior);
        if (codigosAnterioresDelMuseo.has(clave)) motivos.push("El código anterior ya está registrado en el museo");
        const primera = codigosVistos.get(clave);
        if (primera !== undefined) motivos.push(`El código anterior está repetido en el archivo (fila ${primera})`);
        else codigosVistos.set(clave, f.fila);
      }
    }

    if (motivos.length > 0 || !categoria || !estado) {
      errores.push({ fila: f.fila, motivo: motivos.join(". ") });
      continue;
    }
    validas.push({
      fila: f.fila,
      nombre: f.nombre,
      categoriaId: categoria.id,
      categoriaNombre: categoria.nombre,
      descripcion: f.descripcion || undefined,
      anio,
      material: f.material || undefined,
      estadoConservacion: estado,
      ubicacionFisica: f.ubicacion || undefined,
      codigoAnterior: f.codigoAnterior || undefined,
    });
  }
  return { validas, errores };
}

/**
 * Vuelve a validar filas que llegan desde el cliente, que ya no son texto crudo sino datos de pieza.
 * Devuelve true si todas siguen siendo válidas.
 */
export function filasConfirmadasSonValidas(
  filas: FilaImportacion[],
  categorias: Categoria[],
  codigosAnterioresDelMuseo: Set<string>,
): boolean {
  if (filas.length === 0 || filas.length > MAXIMO_FILAS) return false;
  const vistos = new Set<string>();
  for (const f of filas) {
    const nombre = typeof f.nombre === "string" ? f.nombre.trim() : "";
    if (!nombre) return false;
    if (!categorias.some((c) => c.id === f.categoriaId)) return false;
    if (!(ESTADOS_CONSERVACION as readonly string[]).includes(f.estadoConservacion)) return false;
    if (f.anio !== undefined && !anioEnRango(f.anio)) return false;
    if (f.codigoAnterior !== undefined) {
      if (typeof f.codigoAnterior !== "string") return false;
      const codigoAnterior = f.codigoAnterior.trim();
      if (codigoAnterior.length > MAXIMO_CODIGO_ANTERIOR) return false;
      if (codigoAnterior) {
        const clave = claveCodigoAnterior(codigoAnterior);
        if (codigosAnterioresDelMuseo.has(clave) || vistos.has(clave)) return false;
        vistos.add(clave);
      }
    }
  }
  return true;
}
