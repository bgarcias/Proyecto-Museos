import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { ETIQUETAS_ESTADO_CONSERVACION, TITULO_REPORTE } from "./constantes";
import type { Reporte } from "./tipos";

/*
 * Archivos del reporte por categoría y estado, en PDF y en Excel. No usan sesión ni datos:
 * el controlador les pasa el reporte ya calculado y los textos de los filtros aplicados.
 */

export const NOMBRE_HOJA_REPORTE = "Reporte";

export type DatosExportacionReporte = {
  reporte: Reporte;
  generadoPor: string;
  /** Fecha y hora de generación, en hora local del servidor. */
  fechaGeneracion: string;
  /** Pares etiqueta y texto de cada filtro, con "Todas", "Todos" o "Sin límite" cuando no se usó. */
  filtros: [string, string][];
};

const COLUMNAS_ESTADO = (reporte: Reporte) => reporte.estados.map((e) => ETIQUETAS_ESTADO_CONSERVACION[e]);

/* PDF */

const estilos = StyleSheet.create({
  pagina: { padding: 40, fontFamily: "Helvetica", fontSize: 10, color: "#000000" },
  cabecera: { borderBottomWidth: 3, borderBottomColor: "#000000", paddingBottom: 10, marginBottom: 14 },
  titulo: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 10, marginTop: 3 },
  filtros: { marginBottom: 14 },
  filtro: { flexDirection: "row", marginBottom: 2 },
  etiquetaFiltro: { width: 130, fontFamily: "Helvetica-Bold" },
  fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#000000" },
  encabezado: { flexDirection: "row", backgroundColor: "#000000", color: "#FFFFFF" },
  totales: { flexDirection: "row", backgroundColor: "#D9D9D9", borderTopWidth: 2, borderTopColor: "#000000" },
  celdaCategoria: { flexGrow: 3, flexBasis: 0, padding: 5 },
  celdaNumero: { flexGrow: 1, flexBasis: 0, padding: 5, textAlign: "right" },
  negrita: { fontFamily: "Helvetica-Bold" },
});

function DocumentoReporte({ datos }: { datos: DatosExportacionReporte }) {
  const { reporte } = datos;
  return (
    <Document title={TITULO_REPORTE}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>{TITULO_REPORTE}</Text>
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
          <Text style={[estilos.celdaCategoria, estilos.negrita]}>Categoría</Text>
          {COLUMNAS_ESTADO(reporte).map((nombre) => (
            <Text key={nombre} style={[estilos.celdaNumero, estilos.negrita]}>
              {nombre}
            </Text>
          ))}
          <Text style={[estilos.celdaNumero, estilos.negrita]}>Total</Text>
        </View>
        {reporte.filas.map((f) => (
          <View key={f.categoria} style={estilos.fila} wrap={false}>
            <Text style={estilos.celdaCategoria}>{f.categoria}</Text>
            {reporte.estados.map((e) => (
              <Text key={e} style={estilos.celdaNumero}>
                {f.porEstado[e]}
              </Text>
            ))}
            <Text style={[estilos.celdaNumero, estilos.negrita]}>{f.total}</Text>
          </View>
        ))}
        <View style={estilos.totales} wrap={false}>
          <Text style={[estilos.celdaCategoria, estilos.negrita]}>Totales</Text>
          {reporte.estados.map((e) => (
            <Text key={e} style={[estilos.celdaNumero, estilos.negrita]}>
              {reporte.totalesPorEstado[e]}
            </Text>
          ))}
          <Text style={[estilos.celdaNumero, estilos.negrita]}>{reporte.totalGeneral}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generarPdfReporte(datos: DatosExportacionReporte): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<DocumentoReporte datos={datos} />);
  return new Uint8Array(buffer);
}

/* Excel */

export async function generarExcelReporte(datos: DatosExportacionReporte): Promise<Uint8Array> {
  const { reporte } = datos;
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet(NOMBRE_HOJA_REPORTE);

  hoja.addRow([TITULO_REPORTE]).font = { bold: true, size: 14 };
  hoja.addRow(["Generado el", datos.fechaGeneracion]);
  hoja.addRow(["Generado por", datos.generadoPor]);
  for (const [etiqueta, valor] of datos.filtros) hoja.addRow([etiqueta, valor]);
  hoja.addRow([]);

  const encabezado = hoja.addRow(["Categoría", ...COLUMNAS_ESTADO(reporte), "Total"]);
  encabezado.font = { bold: true };
  for (const f of reporte.filas) hoja.addRow([f.categoria, ...reporte.estados.map((e) => f.porEstado[e]), f.total]);
  const totales = hoja.addRow(["Totales", ...reporte.estados.map((e) => reporte.totalesPorEstado[e]), reporte.totalGeneral]);
  totales.font = { bold: true };

  hoja.getColumn(1).width = Math.max(28, ...reporte.filas.map((f) => f.categoria.length + 4));
  for (let i = 2; i <= reporte.estados.length + 2; i++) hoja.getColumn(i).width = 14;
  for (let i = 2; i <= reporte.estados.length + 2; i++) hoja.getColumn(i).alignment = { horizontal: "right" };

  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}
