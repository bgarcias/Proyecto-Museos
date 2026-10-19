import { ETIQUETAS_SITUACION_PRESTAMO } from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import type { PrestamoListado } from "@/lib/tipos";
import { BotonEnlace } from "@/components/ui/Boton";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Tabla from "@/components/ui/Tabla";
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
        <Tabla resumen="Préstamos">
          <thead>
            <tr>
              <th>Pieza</th>
              <th>Institución destino</th>
              <th>Fecha de salida</th>
              <th>Fecha de devolución prevista</th>
              <th>Fecha de devolución</th>
              <th>Situación</th>
            </tr>
          </thead>
          <tbody>
            {prestamos.length === 0 && (
              <tr>
                <td colSpan={6}>No hay préstamos registrados</td>
              </tr>
            )}
            {prestamos.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.piezaCodigo} · {p.piezaNombre}
                </td>
                <td>{p.institucionDestino}</td>
                <td>{formatearFecha(p.fechaSalida)}</td>
                <td>{formatearFecha(p.fechaDevolucionPrevista)}</td>
                <td>{formatearFecha(p.fechaDevolucionReal)}</td>
                <td>
                  <Insignia valor={ETIQUETAS_SITUACION_PRESTAMO[p.situacion]} />
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Celda>
    </div>
  );
}
