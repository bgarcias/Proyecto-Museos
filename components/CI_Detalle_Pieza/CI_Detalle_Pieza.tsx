import { BotonEnlace } from "@/components/ui/Boton";
import { DatoLectura } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import { ETIQUETAS_DISPONIBILIDAD, ETIQUETAS_ESTADO_CONSERVACION } from "@/lib/constantes";
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
            {pieza.codigoAnterior && <DatoLectura etiqueta="Código anterior">{pieza.codigoAnterior}</DatoLectura>}
            <DatoLectura etiqueta="Nombre">{pieza.nombre}</DatoLectura>
            <DatoLectura etiqueta="Categoría">{pieza.categoriaNombre}</DatoLectura>
            <DatoLectura etiqueta="Descripción">{valorOGuion(pieza.descripcion)}</DatoLectura>
            <DatoLectura etiqueta="Año">{valorOGuion(pieza.anio)}</DatoLectura>
            <DatoLectura etiqueta="Material">{valorOGuion(pieza.material)}</DatoLectura>
            <DatoLectura etiqueta="Estado de conservación">
              <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[pieza.estadoConservacion]} />
            </DatoLectura>
            <DatoLectura etiqueta="Disponibilidad">
              <Insignia valor={ETIQUETAS_DISPONIBILIDAD[pieza.disponibilidad]} />
            </DatoLectura>
            <DatoLectura etiqueta="Situación">
              <Insignia valor={pieza.enExhibicion ? "En exhibición" : "En almacén"} />
            </DatoLectura>
            <DatoLectura etiqueta="Ubicación física">{valorOGuion(pieza.ubicacionFisica)}</DatoLectura>
            <DatoLectura etiqueta="Museo">{pieza.museoNombre}</DatoLectura>
            <DatoLectura etiqueta="Fecha de registro">{formatearFecha(pieza.fechaRegistro)}</DatoLectura>
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
