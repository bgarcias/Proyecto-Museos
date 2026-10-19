import { BotonEnlace } from "@/components/ui/Boton";
import { DatoLectura } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import { ETIQUETAS_DISPONIBILIDAD, ETIQUETAS_ESTADO_CONSERVACION, ETIQUETA_CODIGO_ANTERIOR, ETIQUETA_CATEGORIA, ETIQUETA_ESTADO_CONSERVACION, ETIQUETA_DISPONIBILIDAD, ETIQUETA_UBICACION_FISICA, ETIQUETA_FECHA_REGISTRO } from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import type { PiezaListado } from "@/lib/tipos";
import estilos from "./CI_Detalle_Pieza.module.css";

/** Un dato opcional vacío se muestra con un guion simple. */
const valorOGuion = (valor?: string | number): string => (valor === undefined || valor === "" ? "-" : String(valor));

/** Detalle de una pieza: imagen grande y todos sus datos, con las mismas acciones que el catálogo. */
export default function CI_Detalle_Pieza({ pieza }: { pieza: PiezaListado }) {
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Piezas" titulo="Detalle de la pieza" />
      <Celda>
        <div className={estilos.cuerpo}>
          <Miniatura src={pieza.imagenUrl} alt={`Imagen de ${pieza.nombre}`} tamano="detalle" />
          <div className={estilos.datos}>
            <DatoLectura etiqueta="Código">{pieza.codigo}</DatoLectura>
            {pieza.codigoAnterior && <DatoLectura etiqueta={ETIQUETA_CODIGO_ANTERIOR}>{pieza.codigoAnterior}</DatoLectura>}
            <DatoLectura etiqueta="Nombre">{pieza.nombre}</DatoLectura>
            <DatoLectura etiqueta={ETIQUETA_CATEGORIA}>{pieza.categoriaNombre}</DatoLectura>
            <DatoLectura etiqueta="Descripción">{valorOGuion(pieza.descripcion)}</DatoLectura>
            <DatoLectura etiqueta="Año">{valorOGuion(pieza.anio)}</DatoLectura>
            <DatoLectura etiqueta="Material">{valorOGuion(pieza.material)}</DatoLectura>
            <DatoLectura etiqueta={ETIQUETA_ESTADO_CONSERVACION}>
              <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[pieza.estadoConservacion]} />
            </DatoLectura>
            <DatoLectura etiqueta={ETIQUETA_DISPONIBILIDAD}>
              <Insignia valor={ETIQUETAS_DISPONIBILIDAD[pieza.disponibilidad]} />
            </DatoLectura>
            <DatoLectura etiqueta="Situación">
              <Insignia valor={pieza.enExhibicion ? "En exhibición" : "En almacén"} />
            </DatoLectura>
            <DatoLectura etiqueta={ETIQUETA_UBICACION_FISICA}>{valorOGuion(pieza.ubicacionFisica)}</DatoLectura>
            <DatoLectura etiqueta="Museo">{pieza.museoNombre}</DatoLectura>
            <DatoLectura etiqueta={ETIQUETA_FECHA_REGISTRO}>{formatearFecha(pieza.fechaRegistro)}</DatoLectura>
          </div>
        </div>
        <Acciones>
          <BotonEnlace href={`/piezas/${pieza.id}/editar`}>Editar</BotonEnlace>
          <BotonEnlace href={`/piezas/${pieza.id}/estado`}>Actualizar estado de conservación</BotonEnlace>
          <BotonEnlace href={`/piezas/${pieza.id}/historial`}>Ver historial</BotonEnlace>
          <BotonEnlace href={`/piezas/${pieza.id}/ficha`} nuevaPestana>
            Generar ficha técnica
          </BotonEnlace>
          <BotonEnlace href="/piezas">Volver al catálogo</BotonEnlace>
        </Acciones>
      </Celda>
    </div>
  );
}
