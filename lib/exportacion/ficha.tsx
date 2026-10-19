import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

/*
 * Ficha técnica de una pieza en PDF (una página). Usa la fuente por defecto de la librería,
 * así que no se necesitan archivos de fuentes.
 * La librería solo admite imágenes PNG y JPG: con otro formato (por ejemplo los marcadores SVG)
 * o sin imagen, se dibuja un recuadro neutro con el texto "Sin imagen".
 */

export type DatosFicha = {
  museo: string;
  nombre: string;
  codigo: string;
  /** Solo se muestra si existe. */
  codigoAnterior?: string;
  /** Imagen de la pieza. Solo se incluye si es un data URL PNG o JPG. */
  imagenUrl?: string;
  categoria: string;
  descripcion?: string;
  anio?: number;
  material?: string;
  estadoConservacion: string;
  ubicacionFisica?: string;
  disponibilidad: string;
  fechaRegistro: string;
  fechaGeneracion: string;
};

const IMAGEN_ADMITIDA = /^data:image\/(png|jpeg);base64,/;

const estilos = StyleSheet.create({
  pagina: { padding: 40, fontFamily: "Helvetica", fontSize: 11, color: "#000000" },
  cabecera: { borderBottomWidth: 3, borderBottomColor: "#000000", paddingBottom: 10, marginBottom: 20 },
  museo: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  titulo: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 4 },
  codigo: { fontSize: 12, marginTop: 4 },
  cuerpo: { flexDirection: "row", gap: 20 },
  columnaImagen: { width: 200 },
  imagen: { width: 200, height: 200, objectFit: "contain", borderWidth: 2, borderColor: "#000000" },
  sinImagen: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "#000000",
    backgroundColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "center",
  },
  textoSinImagen: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  columnaDatos: { flexGrow: 1, flexShrink: 1 },
  dato: { marginBottom: 10 },
  etiqueta: { fontSize: 8, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  valor: { fontSize: 11 },
  pie: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 6,
    fontSize: 9,
  },
});

function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | number }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Text style={estilos.valor}>{valor === undefined || valor === "" ? "-" : String(valor)}</Text>
    </View>
  );
}

function FichaTecnica({ datos }: { datos: DatosFicha }) {
  const conImagen = datos.imagenUrl !== undefined && IMAGEN_ADMITIDA.test(datos.imagenUrl);
  return (
    <Document title={`Ficha técnica ${datos.codigo}`}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecera}>
          <Text style={estilos.museo}>{datos.museo}</Text>
          <Text style={estilos.titulo}>{datos.nombre}</Text>
          <Text style={estilos.codigo}>Código: {datos.codigo}</Text>
          {datos.codigoAnterior && <Text style={estilos.codigo}>Código anterior: {datos.codigoAnterior}</Text>}
        </View>

        <View style={estilos.cuerpo}>
          <View style={estilos.columnaImagen}>
            {conImagen ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={datos.imagenUrl as string} style={estilos.imagen} />
            ) : (
              <View style={estilos.sinImagen}>
                <Text style={estilos.textoSinImagen}>Sin imagen</Text>
              </View>
            )}
          </View>
          <View style={estilos.columnaDatos}>
            <Dato etiqueta="Categoría" valor={datos.categoria} />
            <Dato etiqueta="Descripción" valor={datos.descripcion} />
            <Dato etiqueta="Año" valor={datos.anio} />
            <Dato etiqueta="Material" valor={datos.material} />
            <Dato etiqueta="Estado de conservación" valor={datos.estadoConservacion} />
            <Dato etiqueta="Ubicación física" valor={datos.ubicacionFisica} />
            <Dato etiqueta="Disponibilidad" valor={datos.disponibilidad} />
            <Dato etiqueta="Fecha de registro" valor={datos.fechaRegistro} />
          </View>
        </View>

        <Text style={estilos.pie} fixed>
          Ficha generada el {datos.fechaGeneracion}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderizarFicha(datos: DatosFicha): Promise<Uint8Array> {
  const buffer = await renderToBuffer(<FichaTecnica datos={datos} />);
  return new Uint8Array(buffer);
}
