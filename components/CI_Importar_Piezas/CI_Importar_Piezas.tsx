"use client";

import { useState } from "react";
import { importarPiezas, validarArchivo } from "@/lib/controllers/CC_Importacion";
import { ETIQUETAS_ESTADO_CONSERVACION } from "@/lib/constantes";
import type { VistaPreviaImportacion } from "@/lib/importacion";
import { MAXIMO_BYTES_ARCHIVO, MAXIMO_FILAS, MAXIMO_MEGABYTES_ARCHIVO } from "@/lib/limitesImportacion";
import type { Museo } from "@/lib/tipos";
import { alertaError, alertaExito } from "@/components/ui/alertas";
import Boton, { BotonEnlace } from "@/components/ui/Boton";
import { AyudaCampo, Campo, Entrada, Formulario, Seleccion } from "@/components/ui/Campo";
import Celda, { Acciones, EncabezadoPagina } from "@/components/ui/Celda";
import Insignia from "@/components/ui/Insignia";
import Mensaje from "@/components/ui/Mensaje";
import Tabla from "@/components/ui/Tabla";
import estilos from "./CI_Importar_Piezas.module.css";

const AYUDA_MUSEO = "Todas las piezas del archivo se registrarán en este museo";
const AYUDA_ARCHIVO = `Solo archivos .xlsx, de máximo ${MAXIMO_MEGABYTES_ARCHIVO} MB y ${MAXIMO_FILAS} filas`;

/** Tres estados en un mismo componente: formulario, vista previa y resultado, en ese orden. */
export default function CI_Importar_Piezas({ museos }: { museos: Museo[] }) {
  const [museoId, setMuseoId] = useState<string>(museos.length === 1 ? museos[0].id : "");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [claveArchivo, setClaveArchivo] = useState(0);
  const [vista, setVista] = useState<VistaPreviaImportacion | null>(null);
  const [totalRegistradas, setTotalRegistradas] = useState<number | null>(null);
  const [procesando, setProcesando] = useState(false);

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const elegido = e.target.files?.[0] ?? null;
    if (elegido && elegido.size > MAXIMO_BYTES_ARCHIVO) {
      alertaError("El archivo supera el tamaño máximo de 5 MB");
      setClaveArchivo((k) => k + 1);
      setArchivo(null);
      return;
    }
    setArchivo(elegido);
  }

  /** Paso 2: validar el archivo. */
  async function validar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!archivo) {
      alertaError("Selecciona el archivo Excel a importar");
      return;
    }
    setProcesando(true);
    const datos = new FormData();
    datos.set("museoId", museoId);
    datos.set("archivo", archivo);
    const resultado = await validarArchivo(datos);
    setProcesando(false);
    if (!resultado.ok) {
      // Flujo alterno: formato incorrecto. Se permite cargar otro archivo.
      alertaError(resultado.error);
      setClaveArchivo((k) => k + 1);
      setArchivo(null);
      return;
    }
    setVista(resultado.datos ?? null);
  }

  /** Paso 6: importar las piezas válidas. */
  async function importar() {
    if (!vista) return;
    setProcesando(true);
    const resultado = await importarPiezas(museoId, vista.validas);
    setProcesando(false);
    if (!resultado.ok) {
      alertaError(resultado.error);
      return;
    }
    alertaExito(resultado.mensaje ?? "");
    setTotalRegistradas(resultado.datos?.total ?? 0);
    setVista(null);
  }

  /** Cancelar la importación: no se registra ninguna pieza. */
  function cancelar() {
    setVista(null);
    setArchivo(null);
    setClaveArchivo((k) => k + 1);
  }

  function importarOtro() {
    setTotalRegistradas(null);
    cancelar();
  }

  /* Estado 3: resultado */
  if (totalRegistradas !== null) {
    return (
      <div className={estilos.pagina}>
        <EncabezadoPagina etiqueta="Piezas" titulo="Importar piezas" />
        <Celda estrecha titulo="Resultado">
          <Mensaje tipo="exito">
            <span>Importación finalizada correctamente</span>
            <span>Total de piezas registradas: {totalRegistradas}</span>
          </Mensaje>
          <Acciones>
            <BotonEnlace href="/piezas" variante="principal">
              Volver al catálogo
            </BotonEnlace>
            <Boton variante="secundario" onClick={importarOtro}>
              Importar otro archivo
            </Boton>
          </Acciones>
        </Celda>
      </div>
    );
  }

  /* Estado 2: vista previa */
  if (vista) {
    const sinValidas = vista.validas.length === 0;
    return (
      <div className={estilos.pagina}>
        <EncabezadoPagina etiqueta="Piezas" titulo="Importar piezas" />
        <Celda titulo="Vista previa">
          <dl className={estilos.resumen}>
            <div>
              <dt>Filas válidas</dt>
              <dd>{vista.validas.length}</dd>
            </div>
            <div>
              <dt>Filas con error</dt>
              <dd>{vista.errores.length}</dd>
            </div>
          </dl>
          {sinValidas && <Mensaje tipo="error">No hay piezas válidas para importar</Mensaje>}

          {vista.errores.length > 0 && (
            <>
              <h2>Filas con error</h2>
              <Tabla resumen="Filas con error">
                <thead>
                  <tr>
                    <th data-numero="true">Fila</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {vista.errores.map((er) => (
                    <tr key={er.fila}>
                      <td data-numero="true">{er.fila}</td>
                      <td>{er.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </>
          )}

          {!sinValidas && (
            <>
              <h2>Piezas que se importarán</h2>
              <Tabla resumen="Piezas válidas">
                <thead>
                  <tr>
                    <th data-numero="true">Fila</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vista.validas.map((f) => (
                    <tr key={f.fila}>
                      <td data-numero="true">{f.fila}</td>
                      <td>{f.nombre}</td>
                      <td>{f.categoriaNombre}</td>
                      <td>
                        <Insignia valor={ETIQUETAS_ESTADO_CONSERVACION[f.estadoConservacion]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </>
          )}

          <Acciones>
            <Boton onClick={importar} disabled={sinValidas || procesando}>
              Importar piezas válidas
            </Boton>
            <Boton variante="secundario" onClick={cancelar} disabled={procesando}>
              Cancelar
            </Boton>
          </Acciones>
        </Celda>
      </div>
    );
  }

  /* Estado 1: formulario */
  return (
    <div className={estilos.pagina}>
      <EncabezadoPagina etiqueta="Piezas" titulo="Importar piezas" />
      <Celda estrecha>
        <Formulario onSubmit={validar}>
          <Campo etiqueta="Museo de destino" htmlFor="museo" obligatorio>
            <Seleccion id="museo" value={museoId} onChange={(e) => setMuseoId(e.target.value)}>
              <option value="">Selecciona un museo</option>
              {museos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Seleccion>
            <AyudaCampo>{AYUDA_MUSEO}</AyudaCampo>
          </Campo>
          <Acciones>
            <BotonEnlace href="/piezas/importar/plantilla" descarga>
              Descargar plantilla
            </BotonEnlace>
          </Acciones>
          <Campo etiqueta="Archivo Excel (.xlsx)" htmlFor="archivo" obligatorio>
            <Entrada
              key={claveArchivo}
              id="archivo"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={elegirArchivo}
            />
            <AyudaCampo>{AYUDA_ARCHIVO}</AyudaCampo>
          </Campo>
          <Acciones>
            <Boton type="submit" disabled={procesando}>
              Validar archivo
            </Boton>
            <BotonEnlace href="/piezas">Cancelar</BotonEnlace>
          </Acciones>
        </Formulario>
      </Celda>
    </div>
  );
}
