"use client";

import { useId, useState } from "react";
import {
  BOTON_MOSTRAR_DEMO,
  BOTON_OCULTAR_DEMO,
  ETIQUETAS_ROL,
  ETIQUETA_DEMO_CONTRASENA,
  ETIQUETA_DEMO_DESACTIVADA,
  ETIQUETA_DEMO_MUSEOS,
  TEXTO_DEMO_AVISO,
  TITULO_DATOS_DEMO,
  textoDemoSoloAdministrador,
} from "@/lib/constantes";
import type { DatosDemo as Datos } from "@/lib/tipos";
import Boton from "@/components/ui/Boton";
import Insignia from "@/components/ui/Insignia";
import estilos from "./DesplegableDemo.module.css";

/** Desplegable con las cuentas de la carga inicial. Cerrado por defecto. */
export default function DesplegableDemo({ datos }: { datos: Datos }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();

  return (
    <section className={estilos.demo} aria-label={TITULO_DATOS_DEMO}>
      <Boton variante="secundario" bloque aria-expanded={abierto} aria-controls={idPanel} onClick={() => setAbierto((a) => !a)}>
        {abierto ? BOTON_OCULTAR_DEMO : BOTON_MOSTRAR_DEMO}
      </Boton>
      <div id={idPanel} className={`${estilos.panel} ${abierto ? estilos.panelAbierto : ""}`}>
        <div className={estilos.interior}>
          <div className={estilos.contenido}>
            <p className={estilos.aviso}>{TEXTO_DEMO_AVISO}</p>
            <p className={estilos.contrasena}>
              {ETIQUETA_DEMO_CONTRASENA}: <strong>{datos.contrasena}</strong>
            </p>
            <ul className={estilos.cuentas}>
              {datos.cuentas.map((c) => (
                <li key={c.clave} className={estilos.cuenta}>
                  <div className={estilos.encabezado}>
                    <span className={estilos.nombre}>{c.nombre}</span>
                    <span className={estilos.rol}>{ETIQUETAS_ROL[c.rol]}</span>
                    {!c.activo && <Insignia valor={ETIQUETA_DEMO_DESACTIVADA} />}
                  </div>
                  <span className={estilos.correo}>{c.correo}</span>
                  <span>
                    {ETIQUETA_DEMO_MUSEOS}: {c.museos.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            {datos.soloAdministrador.length > 0 && <p className={estilos.nota}>{textoDemoSoloAdministrador(datos.soloAdministrador)}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
