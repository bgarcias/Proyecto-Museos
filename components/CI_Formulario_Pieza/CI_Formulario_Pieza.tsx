"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { actualizarPieza, registrarPieza } from "@/lib/controllers/CC_Pieza";
import { MAXIMO_CODIGO_ANTERIOR } from "@/lib/codigos";
import { ESTADOS_CONSERVACION, ETIQUETAS_ESTADO_CONSERVACION, ETIQUETA_CODIGO_ANTERIOR, ETIQUETA_CATEGORIA, ETIQUETA_ESTADO_CONSERVACION, ETIQUETA_UBICACION_FISICA } from "@/lib/constantes";
import type { Categoria, Museo, PiezaListado } from "@/lib/tipos";
import { ANIO_MINIMO } from "@/lib/validaciones";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import {
  AreaTexto,
  AyudaCampo,
  Campo,
  ColumnaFormulario,
  DatoLectura,
  Entrada,
  FilaCompleta,
  Formulario,
  Seleccion,
} from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Miniatura from "@/components/ui/Miniatura";
import estilos from "./CI_Formulario_Pieza.module.css";

const MENSAJE_IMAGEN = "La imagen debe ser PNG o JPG de máximo 1 MB";
const AYUDA_IMAGEN = "Imagen cuadrada recomendada de 800 x 800 px, en PNG o JPG, de máximo 1 MB";
const MAXIMO_IMAGEN_BYTES = 1024 * 1024;

function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(archivo);
  });
}

/**
 * Registrar una pieza (sin datos) o editarla (con la pieza actual), en dos columnas.
 * El orden en el código es el de tabulación: toda la columna izquierda y luego la derecha.
 */
export default function CI_Formulario_Pieza({
  pieza,
  museos,
  categorias,
  anioMaximo,
}: {
  pieza: PiezaListado | null;
  museos: Museo[];
  categorias: Categoria[];
  /** Año actual en la zona horaria del sistema, calculado en el servidor. */
  anioMaximo: number;
}) {
  const router = useRouter();
  const edicion = pieza !== null;
  const [codigoAnterior, setCodigoAnterior] = useState(pieza?.codigoAnterior ?? "");
  const [nombre, setNombre] = useState(pieza?.nombre ?? "");
  const [categoriaId, setCategoriaId] = useState(pieza?.categoriaId ?? "");
  const [descripcion, setDescripcion] = useState(pieza?.descripcion ?? "");
  const [anio, setAnio] = useState(pieza?.anio?.toString() ?? "");
  const [material, setMaterial] = useState(pieza?.material ?? "");
  const [estadoConservacion, setEstadoConservacion] = useState("");
  const [ubicacionFisica, setUbicacionFisica] = useState(pieza?.ubicacionFisica ?? "");
  const [museoId, setMuseoId] = useState<string>(museos.length === 1 ? museos[0].id : "");
  // undefined: sin cambio. null: imagen quitada. Texto: imagen nueva (data URL)
  const [imagen, setImagen] = useState<string | null | undefined>(undefined);
  const [claveArchivo, setClaveArchivo] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const vistaPrevia = imagen === undefined ? pieza?.imagenUrl : (imagen ?? undefined);

  async function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (!["image/png", "image/jpeg"].includes(archivo.type) || archivo.size > MAXIMO_IMAGEN_BYTES) {
      alertaError(MENSAJE_IMAGEN);
      setClaveArchivo((k) => k + 1);
      return;
    }
    setImagen(await leerComoDataUrl(archivo));
  }

  function quitarImagen() {
    setImagen(edicion ? null : undefined);
    setClaveArchivo((k) => k + 1);
  }

  async function alEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    const base = { codigoAnterior, nombre, categoriaId, descripcion, anio, material, ubicacionFisica, imagen };
    const resultado = pieza
      ? await actualizarPieza(pieza.id, base)
      : await registrarPieza({ ...base, estadoConservacion, museoId });
    if (!resultado.ok) {
      alertaError(resultado.error);
      setEnviando(false);
      return;
    }
    // La alerta se dispara antes de navegar: el Toaster del layout sigue visible en el catálogo.
    alertaExito(resultado.mensaje ?? "");
    router.push("/piezas");
  }

  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Piezas" titulo={edicion ? "Editar pieza" : "Registrar pieza"} />
      <Celda ancha>
        <Formulario onSubmit={alEnviar} dosColumnas>
          {pieza && (
            <FilaCompleta>
              <DatoLectura etiqueta="Código">{pieza.codigo}</DatoLectura>
            </FilaCompleta>
          )}
          <ColumnaFormulario>
            {pieza ? (
              <DatoLectura etiqueta="Museo">{pieza.museoNombre}</DatoLectura>
            ) : (
              <Campo etiqueta="Museo" htmlFor="museo" obligatorio>
                <Seleccion id="museo" value={museoId} onChange={(e) => setMuseoId(e.target.value)}>
                  <option value="">Selecciona un museo</option>
                  {museos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            )}
            <Campo etiqueta={ETIQUETA_CODIGO_ANTERIOR} htmlFor="codigo-anterior">
              <Entrada
                id="codigo-anterior"
                value={codigoAnterior}
                maxLength={MAXIMO_CODIGO_ANTERIOR}
                onChange={(e) => setCodigoAnterior(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Nombre" htmlFor="nombre" obligatorio>
              <Entrada id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
            <Campo etiqueta={ETIQUETA_CATEGORIA} htmlFor="categoria" obligatorio>
              <Seleccion id="categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Selecciona una categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Seleccion>
            </Campo>
            {pieza ? (
              <DatoLectura etiqueta={ETIQUETA_ESTADO_CONSERVACION}>
                <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[pieza.estadoConservacion]} />
              </DatoLectura>
            ) : (
              <Campo etiqueta={ETIQUETA_ESTADO_CONSERVACION} htmlFor="estado" obligatorio>
                <Seleccion id="estado" value={estadoConservacion} onChange={(e) => setEstadoConservacion(e.target.value)}>
                  <option value="">Selecciona un estado</option>
                  {ESTADOS_CONSERVACION.map((s) => (
                    <option key={s} value={s}>
                      {ETIQUETAS_ESTADO_CONSERVACION[s]}
                    </option>
                  ))}
                </Seleccion>
              </Campo>
            )}
          </ColumnaFormulario>
          <ColumnaFormulario>
            <Campo etiqueta="Año" htmlFor="anio">
              <Entrada
                id="anio"
                type="number"
                inputMode="numeric"
                min={ANIO_MINIMO}
                max={anioMaximo}
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              />
            </Campo>
            <Campo etiqueta="Material" htmlFor="material">
              <Entrada id="material" value={material} onChange={(e) => setMaterial(e.target.value)} />
            </Campo>
            <Campo etiqueta={ETIQUETA_UBICACION_FISICA} htmlFor="ubicacion">
              <Entrada id="ubicacion" value={ubicacionFisica} onChange={(e) => setUbicacionFisica(e.target.value)} />
            </Campo>
            <Campo etiqueta="Descripción" htmlFor="descripcion">
              <AreaTexto id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </Campo>
          </ColumnaFormulario>
          <FilaCompleta>
            <Campo etiqueta="Imagen" htmlFor="imagen">
              <Entrada key={claveArchivo} id="imagen" type="file" accept="image/png,image/jpeg" onChange={elegirArchivo} />
              <AyudaCampo>{AYUDA_IMAGEN}</AyudaCampo>
              <div className={estilos.vistaPrevia}>
                <Miniatura src={vistaPrevia} alt="Vista previa de la imagen" tamano="grande" />
                <div className={estilos.opcionesImagen}>
                  <span>
                    {vistaPrevia
                      ? "Vista previa. Para reemplazarla, elige otro archivo."
                      : "Sin imagen: se mostrará un marcador de posición. PNG o JPG de máximo 1 MB."}
                  </span>
                  {vistaPrevia && (
                    <Boton variante="secundario" pequeno onClick={quitarImagen}>
                      Quitar imagen
                    </Boton>
                  )}
                </div>
              </div>
            </Campo>
          </FilaCompleta>
          <FilaCompleta>
            <Acciones>
              <Boton type="submit" disabled={enviando}>
                Guardar
              </Boton>
              <BotonEnlace href="/piezas">Cancelar</BotonEnlace>
            </Acciones>
          </FilaCompleta>
        </Formulario>
      </Celda>
    </div>
  );
}
