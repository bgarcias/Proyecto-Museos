"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarMuseo, registrarMuseo } from "@/lib/controllers/CC_Museo";
import { ETIQUETAS_TIPO_COLECCION, TIPOS_COLECCION } from "@/lib/constantes";
import type { Museo } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { Campo, DatoLectura, Entrada, Formulario, Seleccion } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import estilos from "./CI_Formulario_Museo.module.css";

/** Registrar un museo (sin datos) o editarlo (con el museo actual). */
export default function CI_Formulario_Museo({ museo }: { museo: Museo | null }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(museo?.nombre ?? "");
  const [tipo, setTipo] = useState<string>(museo?.tipo ?? "");
  const [direccion, setDireccion] = useState(museo?.direccion ?? "");
  const [enviando, setEnviando] = useState(false);

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const entrada = { nombre, tipo, direccion };
    const resultado = museo ? await actualizarMuseo(museo.id, entrada) : await registrarMuseo(entrada);
    if (resultado.ok) {
      // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en la lista.
      alertaExito(resultado.mensaje ?? "");
      router.push("/museos");
      return;
    }
    alertaError(resultado.error);
    setEnviando(false);
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Museos" titulo={museo ? "Editar museo" : "Nuevo museo"} />
      <Celda estrecha>
        <Formulario onSubmit={alEnviar}>
          <Campo etiqueta="Nombre" htmlFor="nombre" obligatorio>
            <Entrada id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          {museo && <DatoLectura etiqueta="Prefijo">{museo.prefijo}</DatoLectura>}
          <Campo etiqueta="Tipo" htmlFor="tipo" obligatorio>
            <Seleccion id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Selecciona un tipo</option>
              {TIPOS_COLECCION.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETAS_TIPO_COLECCION[t]}
                </option>
              ))}
            </Seleccion>
          </Campo>
          <Campo etiqueta="Dirección" htmlFor="direccion">
            <Entrada id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </Campo>
          <Acciones>
            <Boton type="submit" disabled={enviando}>
              Guardar
            </Boton>
            <BotonEnlace href="/museos">Cancelar</BotonEnlace>
          </Acciones>
        </Formulario>
      </Celda>
    </div>
  );
}
