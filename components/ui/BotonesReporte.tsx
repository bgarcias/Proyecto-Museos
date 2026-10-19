import Boton, { BotonEnlace } from "./Boton";
import { Acciones } from "./Celda";
import estilos from "./BotonesReporte.module.css";

/**
 * Fila de botones de los reportes: Generar Reporte, Limpiar y Volver a la izquierda, exportaciones a la derecha.
 * El PDF abre en pestaña nueva y el Excel se descarga. Las exportaciones solo salen si hay un reporte en pantalla (con sus enlaces ya armados).
 */
export default function BotonesReporte({
  enviando,
  onLimpiar,
  hrefPdf,
  hrefExcel,
}: {
  enviando: boolean;
  onLimpiar: () => void;
  hrefPdf?: string;
  hrefExcel?: string;
}) {
  return (
    <div className={estilos.fila}>
      <Acciones>
        <Boton type="submit" disabled={enviando}>
          Generar Reporte
        </Boton>
        <Boton variante="secundario" onClick={onLimpiar}>
          Limpiar
        </Boton>
        <BotonEnlace href="/reportes">Volver</BotonEnlace>
      </Acciones>
      {hrefPdf && hrefExcel && (
        <Acciones>
          <BotonEnlace href={hrefPdf} nuevaPestana>
            Exportar a PDF
          </BotonEnlace>
          <BotonEnlace href={hrefExcel} descarga>
            Exportar a Excel
          </BotonEnlace>
        </Acciones>
      )}
    </div>
  );
}
