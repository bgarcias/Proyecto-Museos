import { BotonEnlace } from "@/components/ui/Boton";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import Tabla from "@/components/ui/Tabla";
import type { RegistroHistorial } from "@/lib/controllers/CC_Historial";
import { CAMPO_ESTADO_CONSERVACION, etiquetaCampoHistorial, etiquetaValorHistorial } from "@/lib/constantes";
import { formatearFechaHora } from "@/lib/fechas";
import type { Pieza } from "@/lib/tipos";
import estilos from "./CI_Historial_Pieza.module.css";

export default function CI_Historial_Pieza({ pieza, registros }: { pieza: Pieza; registros: RegistroHistorial[] }) {
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Historial de cambios" titulo="Historial de la pieza" />
      <Celda>
        <div className={estilos.pieza}>
          <Miniatura src={pieza.imagenUrl} alt={`Imagen de ${pieza.nombre}`} tamano="grande" />
          <h2>{pieza.nombre}</h2>
        </div>
        <Tabla resumen="Historial de cambios">
          <thead>
            <tr>
              <th>Dato modificado</th>
              <th>Valor anterior</th>
              <th>Valor nuevo</th>
              <th>Usuario</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr>
                <td colSpan={5}>Esta pieza aún no tiene cambios registrados</td>
              </tr>
            )}
            {registros.map((r) => (
              <tr key={r.id}>
                <td>{etiquetaCampoHistorial(r.campoModificado)}</td>
                <td>
                  {r.campoModificado === CAMPO_ESTADO_CONSERVACION ? (
                    <Insignia valor={etiquetaValorHistorial(r.campoModificado, r.valorAnterior)} />
                  ) : (
                    etiquetaValorHistorial(r.campoModificado, r.valorAnterior)
                  )}
                </td>
                <td>
                  {r.campoModificado === CAMPO_ESTADO_CONSERVACION ? (
                    <Insignia valor={etiquetaValorHistorial(r.campoModificado, r.valorNuevo)} />
                  ) : (
                    etiquetaValorHistorial(r.campoModificado, r.valorNuevo)
                  )}
                </td>
                <td>{r.usuarioNombre}</td>
                <td>{formatearFechaHora(r.fecha)}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
        <Acciones>
          <BotonEnlace href="/piezas">Volver</BotonEnlace>
        </Acciones>
      </Celda>
    </div>
  );
}
