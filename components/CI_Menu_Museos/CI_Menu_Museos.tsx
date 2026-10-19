"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { activarMuseo, desactivarMuseo } from "@/lib/controllers/CC_Museo";
import { ETIQUETAS_TIPO_COLECCION } from "@/lib/constantes";
import type { Museo } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import Celda, { EncabezadoPagina } from "@/components/ui/Celda";
import PopupConfirmacion from "@/components/ui/PopupConfirmacion";
import Insignia from "@/components/ui/Insignia";
import Tabla from "@/components/ui/Tabla";
import estilos from "./CI_Menu_Museos.module.css";

export default function CI_Menu_Museos({ museos }: { museos: Museo[] }) {
  const router = useRouter();
  const [seleccionado, setSeleccionado] = useState<Museo | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function confirmar() {
    if (!seleccionado) return;
    setProcesando(true);
    const resultado = seleccionado.activo
      ? await desactivarMuseo(seleccionado.id)
      : await activarMuseo(seleccionado.id);
    setProcesando(false);
    setSeleccionado(null);
    if (resultado.ok) {
      alertaExito(resultado.mensaje ?? "");
      router.refresh();
    } else {
      alertaError(resultado.error);
    }
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina
        etiqueta="Administración"
        titulo="Museos"
        acciones={<BotonEnlace href="/museos/nuevo" variante="principal">Nuevo Museo</BotonEnlace>}
      />
      <Celda>
        <Tabla resumen="Museos">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Prefijo</th>
              <th>Tipo</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {museos.length === 0 && (
              <tr>
                <td colSpan={6}>No hay museos registrados</td>
              </tr>
            )}
            {museos.map((m) => (
              <tr key={m.id}>
                <td>{m.nombre}</td>
                <td>{m.prefijo}</td>
                <td>{ETIQUETAS_TIPO_COLECCION[m.tipo]}</td>
                <td>{m.direccion ?? "-"}</td>
                <td>
                  <Insignia valor={m.activo ? "Activo" : "Inactivo"} />
                </td>
                <td>
                  <div className={estilos.acciones}>
                    <BotonEnlace href={`/museos/${m.id}`} pequeno>
                      Editar
                    </BotonEnlace>
                    <Boton variante={m.activo ? "peligro" : "secundario"} pequeno onClick={() => setSeleccionado(m)}>
                      {m.activo ? "Desactivar" : "Activar"}
                    </Boton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Celda>

      {seleccionado && (
        <PopupConfirmacion
          titulo={seleccionado.activo ? "Desactivar museo" : "Activar museo"}
          procesando={procesando}
          onConfirmar={confirmar}
          onCancelar={() => setSeleccionado(null)}
        >
          {seleccionado.activo
            ? `¿Desactivar el museo «${seleccionado.nombre}»? Dejará de ofrecerse en los formularios nuevos. Sus piezas y exposiciones se conservan.`
            : `¿Activar el museo «${seleccionado.nombre}»? Volverá a ofrecerse en los formularios nuevos.`}
        </PopupConfirmacion>
      )}
    </div>
  );
}
