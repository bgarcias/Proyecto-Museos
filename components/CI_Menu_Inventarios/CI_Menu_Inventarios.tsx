"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearInventario } from "@/lib/controllers/CC_Inventario";
import { ETIQUETAS_ESTADO_INVENTARIO } from "@/lib/constantes";
import { formatearFecha } from "@/lib/fechas";
import type { InventarioListado, Museo } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { Campo, Seleccion } from "@/components/ui/Campo";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Tabla from "@/components/ui/Tabla";
import Ventana from "@/components/ui/Ventana";
import estilos from "./CI_Menu_Inventarios.module.css";

/** Lista de inventarios y el botón "Nuevo inventario". */
export default function CI_Menu_Inventarios({
  inventarios,
  museos,
}: {
  inventarios: InventarioListado[];
  museos: Museo[];
}) {
  const router = useRouter();
  const [ventana, setVentana] = useState(false);
  const [museoId, setMuseoId] = useState("");
  const [procesando, setProcesando] = useState(false);

  async function crear() {
    setProcesando(true);
    const resultado = await crearInventario(museoId);
    if (resultado.ok && resultado.datos) {
      // La alerta se dispara antes de navegar al inventario en curso
      alertaExito("Inventario iniciado");
      router.push(`/inventarios/${resultado.datos.id}`);
      return;
    }
    alertaError(resultado.ok ? "No se pudo crear el inventario" : resultado.error);
    setProcesando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        etiqueta="Colección"
        titulo="Inventarios"
        acciones={
          <Boton
            onClick={() => {
              setMuseoId(museos.length === 1 ? museos[0].id : "");
              setVentana(true);
            }}
          >
            Nuevo inventario
          </Boton>
        }
      />
      <Celda>
        <Tabla resumen="Inventarios">
          <thead>
            <tr>
              <th>Museo</th>
              <th>Fecha de inicio</th>
              <th>Fecha de cierre</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inventarios.length === 0 && (
              <tr>
                <td colSpan={5}>No hay inventarios registrados</td>
              </tr>
            )}
            {inventarios.map((i) => (
              <tr key={i.id}>
                <td>{i.museoNombre}</td>
                <td>{formatearFecha(i.fechaInicio)}</td>
                <td>{formatearFecha(i.fechaCierre)}</td>
                <td>
                  <Insignia valor={ETIQUETAS_ESTADO_INVENTARIO[i.estado]} />
                </td>
                <td>
                  <BotonEnlace href={`/inventarios/${i.id}`} pequeno>
                    {i.estado === "en_curso" ? "Continuar" : "Ver"}
                  </BotonEnlace>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Celda>

      {ventana && (
        <Ventana
          titulo="Nuevo inventario"
          dialogo
          onCerrar={() => setVentana(false)}
          pie={
            <>
              <Boton variante="secundario" onClick={() => setVentana(false)} disabled={procesando}>
                Cancelar
              </Boton>
              <Boton onClick={crear} disabled={!museoId || procesando}>
                Crear inventario
              </Boton>
            </>
          }
        >
          <Campo etiqueta="Museo" htmlFor="museo-inventario" obligatorio>
            <Seleccion id="museo-inventario" value={museoId} onChange={(e) => setMuseoId(e.target.value)}>
              <option value="">Selecciona un museo</option>
              {museos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Seleccion>
          </Campo>
        </Ventana>
      )}
    </div>
  );
}
