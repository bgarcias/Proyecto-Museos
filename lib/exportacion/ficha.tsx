import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  ETIQUETA_CATEGORIA,
  ETIQUETA_DISPONIBILIDAD,
  ETIQUETA_ESTADO_CONSERVACION,
  ETIQUETA_FECHA_REGISTRO,
  ETIQUETA_UBICACION_FISICA,
  TAMANO_MAXIMO_IMAGEN_FICHA,
  TIEMPO_MAXIMO_IMAGEN_FICHA_MS,
} from "../constantes";
import { esNombreDeArchivoDeImagen, urlImagenPieza } from "../imagenes";

/*
 * Ficha técnica de una pieza en PDF, una página, con la fuente por defecto de la librería.
 * La librería solo admite PNG y JPG: con otro formato (p. ej. marcadores SVG) o sin imagen se dibuja un recuadro "Sin imagen".
 */

export type DatosFicha = {
  museo: string;
  nombre: string;
  codigo: string;
  /** Solo se muestra si existe. */
  codigoAnterior?: string;
  /** Lo guardado en imagen_url: nombre de archivo del bucket o data URL. Solo se incluye si resulta ser PNG o JPG. */
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
            <Dato etiqueta={ETIQUETA_CATEGORIA} valor={datos.categoria} />
            <Dato etiqueta="Descripción" valor={datos.descripcion} />
            <Dato etiqueta="Año" valor={datos.anio} />
            <Dato etiqueta="Material" valor={datos.material} />
            <Dato etiqueta={ETIQUETA_ESTADO_CONSERVACION} valor={datos.estadoConservacion} />
            <Dato etiqueta={ETIQUETA_UBICACION_FISICA} valor={datos.ubicacionFisica} />
            <Dato etiqueta={ETIQUETA_DISPONIBILIDAD} valor={datos.disponibilidad} />
            <Dato etiqueta={ETIQUETA_FECHA_REGISTRO} valor={datos.fechaRegistro} />
          </View>
        </View>

        <Text style={estilos.pie} fixed>
          Ficha generada el {datos.fechaGeneracion}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Imagen lista para el PDF como data URL PNG o JPG, o undefined si no hay imagen utilizable.
 * Un data URL se usa tal cual. Un nombre de archivo se descarga del bucket público con tiempo máximo.
 * Nunca lanza: ante cualquier fallo devuelve undefined y la ficha lleva el recuadro "Sin imagen".
 */
async function prepararImagen(valor?: string): Promise<string | undefined> {
  try {
    if (!valor) return undefined;
    if (valor.startsWith("data:")) return IMAGEN_ADMITIDA.test(valor) ? valor : undefined;
    // Solo se descarga lo que sale del bucket propio. Una dirección http guardada no se visita desde el servidor.
    if (!esNombreDeArchivoDeImagen(valor)) return undefined;
    const direccion = urlImagenPieza(valor);
    if (!direccion) return undefined;
    const respuesta = await fetch(direccion, { signal: AbortSignal.timeout(TIEMPO_MAXIMO_IMAGEN_FICHA_MS), cache: "no-store" });
    if (!respuesta.ok) return undefined;
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    if (bytes.length === 0 || bytes.length > TAMANO_MAXIMO_IMAGEN_FICHA) return undefined;
    // El formato se decide por los primeros bytes, no por lo que declare el servidor
    const esPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const esJpg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!esPng && !esJpg) return undefined;
    return `data:image/${esPng ? "png" : "jpeg"};base64,${bytes.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function renderizarFicha(datos: DatosFicha): Promise<Uint8Array> {
  const imagenUrl = await prepararImagen(datos.imagenUrl);
  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(<FichaTecnica datos={{ ...datos, imagenUrl }} />);
  } catch (error) {
    // Una imagen dañada que la librería no pueda leer no debe impedir la ficha: se reintenta sin imagen
    if (!imagenUrl) throw error;
    buffer = await renderToBuffer(<FichaTecnica datos={{ ...datos, imagenUrl: undefined }} />);
  }
  return new Uint8Array(buffer);
}
