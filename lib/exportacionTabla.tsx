import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { formatearMonto } from "./formatos";

/*
 * Exportación genérica de un reporte en forma de tabla, a PDF y a Excel. La usan los reportes de piezas, de
 * exposiciones y de préstamos. No usa sesión ni datos: el controlador le pasa todo ya calculado.
 */

export const NOMBRE_HOJA_TABLA = "Reporte";

export type ColumnaTabla = {
  etiqueta: string;
  /** Ancho relativo de la columna respecto de las demás. */
  ancho: number;
  alineacion?: "izquierda" | "derecha" | "centro";
};

/** Una celda es texto, un número (con `monto` se muestra con 2 decimales) o varias líneas de texto. */
export type CeldaTabla = string | number | string[];

export type DatosTabla = {
  titulo: string;
  /** Fecha y hora de generación, en hora local del servidor. */
  fechaGeneracion: string;
  generadoPor: string;
  /** Pares etiqueta y texto de cada filtro, con "Todos", "Todas" o "Sin límite" cuando no se usó. */
  filtros: [string, string][];
  columnas: ColumnaTabla[];
  filas: CeldaTabla[][];
  /** Columnas numéricas que son montos: 2 decimales en el PDF y formato numérico en el Excel. */
  columnasMonto?: number[];
  /** Fila final de total: etiqueta y valor. */
  total: { etiqueta: string; valor: number };
  orientacion: "vertical" | "horizontal";
};

const ALINEACION = { izquierda: "left", derecha: "right", centro: "center" } as const;

function textoDeCelda(celda: CeldaTabla, esMonto: boolean): string {
  if (Array.isArray(celda)) return celda.join("\n");
  if (typeof celda === "number") return esMonto ? formatearMonto(celda) : String(celda);
  return celda;
}

/* PDF */

const estilos = StyleSheet.create({
  pagina: { padding: 36, fontFamily: "Helvetica", fontSize: 8, color: "#000000" },
  cabecera: { borderBottomWidth: 3, borderBottomColor: "#000000", paddingBottom: 8, marginBottom: 10 },
  titulo: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, marginTop: 2 },
  filtros: { marginBottom: 10 },
  filtro: { flexDirection: "row", marginBottom: 1 },
  etiquetaFiltro: { width: 110, fontFamily: "Helvetica-Bold" },
  encabezado: { flexDirection: "row", backgroundColor: "#000000", color: "#FFFFFF" },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000000" },
  total: { flexDirection: "row", backgroundColor: "#D9D9D9", borderTopWidth: 2, borderTopColor: "#000000", padding: 5 },
  celda: { padding: 4 },
  negrita: { fontFamily: "Helvetica-Bold" },
  pie: { position: "absolute", left: 36, right: 36, bottom: 18, fontSize: 8, textAlign: "right" },
});

function DocumentoTabla({ datos }: { datos: DatosTabla }) {
  const monto = new Set(datos.columnasMonto ?? []);
  const estiloCelda = (i: number) => ({
    ...estilos.celda,
    flexGrow: datos.columnas[i].ancho,
    flexBasis: 0,
    textAlign: ALINEACION[datos.columnas[i].alineacion ?? "izquierda"],
  });
  return (
    <Document title={datos.titulo}>
      <Page size="A4" orientation={datos.orientacion === "horizontal" ? "landscape" : "portrait"} style={estilos.pagina}>
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>{datos.titulo}</Text>
          <Text style={estilos.meta}>Generado el {datos.fechaGeneracion}</Text>
          <Text style={estilos.meta}>Generado por {datos.generadoPor}</Text>
        </View>

        <View style={estilos.filtros}>
          {datos.filtros.map(([etiqueta, valor]) => (
            <View key={etiqueta} style={estilos.filtro}>
              <Text style={estilos.etiquetaFiltro}>{etiqueta}</Text>
              <Text>{valor}</Text>
            </View>
          ))}
        </View>

        <View style={estilos.encabezado} fixed>
          {datos.columnas.map((c, i) => (
            <Text key={c.etiqueta} style={[estiloCelda(i), estilos.negrita]}>
              {c.etiqueta}
            </Text>
          ))}
        </View>
        {datos.filas.map((fila, n) => (
          <View key={n} style={estilos.fila} wrap={false}>
            {fila.map((celda, i) => (
              <Text key={i} style={estiloCelda(i)}>
                {textoDeCelda(celda, monto.has(i))}
              </Text>
            ))}
          </View>
        ))}
        <View style={estilos.total} wrap={false}>
          <Text style={estilos.negrita}>
            {datos.total.etiqueta}: {datos.total.valor}
          </Text>
        </View>

        <Text style={estilos.pie} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
}

export async function generarPdfTabla(datos: DatosTabla): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<DocumentoTabla datos={datos} />);
  return new Uint8Array(buffer);
}

/* Excel */

export async function generarExcelTabla(datos: DatosTabla): Promise<Uint8Array> {
  const monto = new Set(datos.columnasMonto ?? []);
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(NOMBRE_HOJA_TABLA);

  hoja.addRow([datos.titulo]).font = { bold: true, size: 14 };
  hoja.addRow(["Generado el", datos.fechaGeneracion]);
  hoja.addRow(["Generado por", datos.generadoPor]);
  for (const [etiqueta, valor] of datos.filtros) hoja.addRow([etiqueta, valor]);
  hoja.addRow([]);

  hoja.addRow(datos.columnas.map((c) => c.etiqueta)).font = { bold: true };
  for (const fila of datos.filas) {
    const agregada = hoja.addRow(fila.map((c) => (Array.isArray(c) ? c.join("\n") : c)));
    agregada.alignment = { vertical: "top", wrapText: true };
  }
  const total = hoja.addRow([datos.total.etiqueta, datos.total.valor]);
  total.font = { bold: true };

  datos.columnas.forEach((c, i) => {
    const columna = hoja.getColumn(i + 1);
    columna.width = Math.max(10, Math.round(c.ancho * 9));
    if (monto.has(i)) columna.numFmt = "#,##0.00";
    if (c.alineacion === "derecha") columna.alignment = { horizontal: "right", vertical: "top", wrapText: true };
    if (c.alineacion === "centro") columna.alignment = { horizontal: "center", vertical: "top", wrapText: true };
  });

  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
