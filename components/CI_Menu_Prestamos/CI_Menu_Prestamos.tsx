import {
  ETIQUETA_CON_DETERIORO,
  ETIQUETAS_SITUACION_PRESTAMO,
  TEXTO_EVALUAR_RECLAMO_POLIZA,
  textoValorAseguradoSoles,
} from "@/lib/constantes";
import { textoDeterioro } from "@/lib/deterioro";
import { formatearFecha } from "@/lib/fechas";
import type { PrestamoListado } from "@/lib/tipos";
import { BotonEnlace } from "@/components/ui/Boton";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Tabla from "@/components/ui/Tabla";
import tablaEstilos from "@/components/ui/TablaReporte.module.css";
import estilos from "./CI_Menu_Prestamos.module.css";

/** Módulo de préstamos: las opciones "Nuevo préstamo" y "Registrar devolución", y la lista de préstamos. */
export default function CI_Menu_Prestamos({ prestamos }: { prestamos: PrestamoListado[] }) {
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        etiqueta="Colección"
        titulo="Préstamos"
        acciones={
          <>
            <BotonEnlace href="/prestamos/nuevo" variante="principal">
              Nuevo préstamo
            </BotonEnlace>
            <BotonEnlace href="/prestamos/devolucion">Registrar devolución</BotonEnlace>
          </>
        }
      />
      <Celda>
        <Tabla resumen="Préstamos" clase={tablaEstilos.tabla}>
          <thead>
            <tr>
              <th className={estilos.pieza}>Pieza</th>
              <th className={estilos.institucion}>Institución destino</th>
              <th className={estilos.fecha}>Fecha de salida</th>
              <th className={estilos.fechaPrevista}>Fecha de devolución prevista</th>
              <th className={estilos.fecha}>Fecha de devolución</th>
              <th className={estilos.situacion}>Situación</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.length === 0 && (
              <tr>
                <td colSpan={6}>No hay préstamos registrados</td>
              </tr>
            )}
            {prestamos.map((p) => {
              const deterioro = p.situacion === "devuelto" ? textoDeterioro(p) : undefined;
              return (
                <tr key={p.id}>
                  <td>
                    {p.piezaCodigo} · {p.piezaNombre}
                  </td>
                  <td>{p.institucionDestino}</td>
                  <td className={tablaEstilos.linea}>{formatearFecha(p.fechaSalida)}</td>
                  <td className={tablaEstilos.linea}>{formatearFecha(p.fechaDevolucionPrevista)}</td>
                  <td className={tablaEstilos.linea}>{formatearFecha(p.fechaDevolucionReal)}</td>
                  <td>
                    {deterioro ? (
                      <div className={estilos.pila}>
                        <Insignia valor={ETIQUETAS_SITUACION_PRESTAMO[p.situacion]} />
                        <Insignia valor={ETIQUETA_CON_DETERIORO} />
                        <p className={`${estilos.linea} ${tablaEstilos.linea}`}>{TEXTO_EVALUAR_RECLAMO_POLIZA}</p>
                        <p className={`${estilos.linea} ${tablaEstilos.linea}`}>{textoValorAseguradoSoles(p.valorAsegurado)}</p>
                      </div>
                    ) : (
                      <Insignia valor={ETIQUETAS_SITUACION_PRESTAMO[p.situacion]} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Tabla>
      </Celda>
    </div>
  );
}
