"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "../auth/session";
import { MENSAJE_EXPOSICION_FECHAS_LIMITE, MENSAJE_EXPOSICION_SIN_PIEZAS } from "../constantes";
import { obtenerDatos } from "../data";
import type { Datos } from "../data/contratos";
import { fechaLimite, formatearFecha, rangoExposicion, rangosSeCruzan } from "../fechas";
import type {
  Categoria,
  ConflictoPieza,
  ExposicionListado,
  FiltrosExposiciones,
  Museo,
  PiezaListado,
  PiezaResumen,
  Resultado,
  ResultadoGuardarExposicion,
  UsuarioPublico,
} from "../tipos";
import {
  coincideTexto,
  exposicionesVisibles,
  museosActivosVisibles,
  museosVisibles,
  piezasVisibles,
} from "./utilidades";

/* ECUS05: Gestionar Exposición (registrar, modificar y cancelar) */

/* Menú del módulo y buscador de exposiciones. El buscador se usa como página y como ventana emergente. */

export async function buscarExposiciones(filtros: FiltrosExposiciones): Promise<ExposicionListado[]> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const exposiciones = await exposicionesVisibles(datos, usuario);
  return exposiciones
    .filter(
      (e) =>
        coincideTexto(e.nombre, filtros.nombre) &&
        (!filtros.vigencia || filtros.vigencia === "todas" || e.estado === filtros.vigencia) &&
        (!filtros.museoId || e.museoId === filtros.museoId),
    )
    .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
}

export async function cargarExposiciones(): Promise<{ exposiciones: ExposicionListado[]; museos: Museo[] }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return { exposiciones: await buscarExposiciones({}), museos: await museosVisibles(datos, usuario) };
}

/** Exposición visible para la persona, con su estado calculado. */
async function exposicionVisible(datos: Datos, usuario: UsuarioPublico, id: string): Promise<ExposicionListado | undefined> {
  return (await exposicionesVisibles(datos, usuario)).find((e) => e.id === id);
}

/* Formulario de exposición: nueva y modificar */

/**
 * Datos del formulario, para registrar (sin id) o modificar (con id).
 * Al registrar, el museo sede se elige entre los museos activos asignados a la persona.
 * Devuelve null si la exposición no existe, no es accesible o ya no se puede modificar (finalizada o cancelada).
 */
export async function cargarFormularioExposicion(
  id?: string,
): Promise<{
  museos: Museo[];
  categorias: Categoria[];
  exposicion: ExposicionListado | null;
  piezas: PiezaListado[];
  /** Última fecha permitida para las fechas de la exposición, calculada en el servidor. */
  limite: string;
} | null> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const categorias = await datos.listarCategorias(usuario.organizacionId);
  const limite = fechaLimite();
  if (!id) return { museos: await museosActivosVisibles(datos, usuario), categorias, exposicion: null, piezas: [], limite };

  const exposicion = await exposicionVisible(datos, usuario, id);
  if (!exposicion || exposicion.estado === "finalizada" || exposicion.estado === "cancelada") return null;
  // Se ofrecen los museos activos y, además, el museo sede actual aunque esté inactivo.
  const museos = (await museosVisibles(datos, usuario)).filter((m) => m.activo || m.id === exposicion.museoId);
  const piezas = (await piezasVisibles(datos, usuario)).filter((p) => exposicion.piezaIds.includes(p.id));
  return { museos, categorias, exposicion, piezas, limite };
}

type EntradaExposicion = {
  nombre: string;
  descripcion: string;
  museoId: string;
  fechaInicio: string;
  fechaFin: string;
  piezaIds: string[];
};

/**
 * Validaciones al guardar, en este orden: fechas (orden y límite de años), al menos una pieza; museo de las piezas igual al museo sede;
 * disponibilidad de cada pieza (préstamos abiertos y otras exposiciones con fechas cruzadas).
 * Si hay piezas en conflicto no se guarda nada y se devuelven para quitarlas de la selección.
 */
async function guardarExposicion(
  idActual: string | undefined,
  entrada: EntradaExposicion,
): Promise<ResultadoGuardarExposicion> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();

  const nombre = entrada.nombre.trim();
  if (!nombre) return { ok: false, error: "Ingresa el nombre de la exposición" };
  if (!entrada.museoId) return { ok: false, error: "Selecciona el museo sede" };
  if (!entrada.fechaInicio) return { ok: false, error: "Ingresa la fecha de inicio" };
  if (!entrada.fechaFin) return { ok: false, error: "Ingresa la fecha de fin" };

  const exposiciones = await exposicionesVisibles(datos, usuario);
  const actual = idActual ? exposiciones.find((e) => e.id === idActual) : undefined;
  if (idActual) {
    if (!actual) return { ok: false, error: "No se encontró la exposición" };
    if (actual.estado === "finalizada" || actual.estado === "cancelada") {
      return { ok: false, error: "No es posible modificar esta exposición" };
    }
  }

  // El museo sede debe ser accesible; al registrar, además, activo.
  const museos = await museosVisibles(datos, usuario);
  const museo = museos.find((m) => m.id === entrada.museoId);
  if (!museo || (!museo.activo && actual?.museoId !== museo?.id)) {
    return { ok: false, error: "No tienes acceso al museo seleccionado" };
  }

  // Paso 7: fechas
  if (entrada.fechaFin < entrada.fechaInicio) {
    return { ok: false, error: "La fecha de fin no puede ser anterior a la fecha de inicio" };
  }
  if (entrada.fechaFin === entrada.fechaInicio) {
    return { ok: false, error: "La fecha de fin debe ser posterior a la fecha de inicio" };
  }

  // Ninguna de las dos fechas puede superar el límite de años desde hoy
  const limite = fechaLimite();
  if (entrada.fechaInicio > limite || entrada.fechaFin > limite) {
    return { ok: false, error: MENSAJE_EXPOSICION_FECHAS_LIMITE };
  }

  // Al menos una pieza
  if (entrada.piezaIds.length === 0) return { ok: false, error: MENSAJE_EXPOSICION_SIN_PIEZAS };

  // Piezas elegidas: deben existir y ser accesibles para la persona
  const piezaIds = [...new Set(entrada.piezaIds)];
  const visibles = await piezasVisibles(datos, usuario);
  const piezas = piezaIds.map((pid) => visibles.find((p) => p.id === pid));
  if (piezas.some((p) => !p)) {
    return { ok: false, error: "Alguna de las piezas seleccionadas no existe o no está disponible" };
  }
  const elegidas = piezas as PiezaListado[];
  const conflictos: ConflictoPieza[] = [];

  // Museo de las piezas igual al museo sede
  for (const pieza of elegidas.filter((p) => p.museoId !== museo.id)) {
    conflictos.push({ piezaId: pieza.id, piezaNombre: pieza.nombre, motivo: `Pertenece a otro museo (${pieza.museoNombre})` });
  }

  // Disponibilidad en las fechas de la exposición
  const rango = { inicio: entrada.fechaInicio, fin: entrada.fechaFin };
  const prestamosAbiertos = (await datos.listarPrestamos()).filter((p) => !p.fechaDevolucionReal);
  for (const pieza of elegidas.filter((p) => p.museoId === museo.id)) {
    const prestamo = prestamosAbiertos.find(
      (pr) =>
        pr.piezaId === pieza.id && rangosSeCruzan({ inicio: pr.fechaSalida, fin: pr.fechaDevolucionPrevista }, rango),
    );
    if (prestamo) {
      conflictos.push({
        piezaId: pieza.id,
        piezaNombre: pieza.nombre,
        motivo: `En préstamo a ${prestamo.institucionDestino} (hasta el ${formatearFecha(prestamo.fechaDevolucionPrevista)})`,
      });
      continue;
    }
    // Las exposiciones canceladas no cuentan para los cruces
    const otra = exposiciones.find(
      (e) =>
        e.id !== idActual &&
        e.estado !== "cancelada" &&
        e.piezaIds.includes(pieza.id) &&
        rangosSeCruzan(rangoExposicion(e), rango),
    );
    if (otra) {
      conflictos.push({ piezaId: pieza.id, piezaNombre: pieza.nombre, motivo: `Asignada a la exposición «${otra.nombre}» en fechas que se cruzan` });
    }
  }

  // Paso 8 (flujo alterno): se indican las piezas que no pueden asignarse y no se guarda nada
  if (conflictos.length > 0) {
    return { ok: false, error: "Las siguientes piezas no pueden asignarse a la exposición", conflictos };
  }

  const campos = {
    nombre,
    descripcion: entrada.descripcion.trim() || undefined,
    museoId: museo.id,
    fechaInicio: entrada.fechaInicio,
    fechaFin: entrada.fechaFin,
    piezaIds,
  };
  if (idActual) {
    await datos.actualizarExposicion(idActual, campos);
  } else {
    await datos.crearExposicion(campos);
  }
  revalidatePath("/exposiciones");
  revalidatePath("/piezas");
  return {
    ok: true,
    mensaje: idActual ? "Exposición actualizada correctamente" : "Exposición registrada correctamente",
  };
}

export async function registrarExposicion(entrada: EntradaExposicion): Promise<ResultadoGuardarExposicion> {
  return guardarExposicion(undefined, entrada);
}

export async function actualizarExposicion(id: string, entrada: EntradaExposicion): Promise<ResultadoGuardarExposicion> {
  return guardarExposicion(id, entrada);
}

/* Modificar exposición: tras buscar y elegir la exposición */

export async function elegirExposicionParaModificar(id: string): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const exposicion = await exposicionVisible(datos, usuario, id);
  if (!exposicion) return { ok: false, error: "No se encontró la exposición" };
  if (exposicion.estado === "finalizada" || exposicion.estado === "cancelada") {
    return { ok: false, error: "No es posible modificar esta exposición" };
  }
  return { ok: true };
}

/* Cancelar exposición */

/** Pasos 1 y 2: tras elegir la exposición, valida que se pueda cancelar y devuelve su resumen. */
export async function elegirExposicionParaCancelar(
  id: string,
): Promise<Resultado<{ exposicion: ExposicionListado; piezas: PiezaResumen[] }>> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const exposicion = await exposicionVisible(datos, usuario, id);
  if (!exposicion) return { ok: false, error: "No se encontró la exposición" };
  if (exposicion.estado === "finalizada" || exposicion.estado === "cancelada") {
    return { ok: false, error: "No es posible cancelar esta exposición" };
  }
  const todas = await datos.listarPiezas();
  const piezas = exposicion.piezaIds
    .map((pid) => todas.find((p) => p.id === pid))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ id: p.id, nombre: p.nombre, imagenUrl: p.imagenUrl }));
  return { ok: true, datos: { exposicion, piezas } };
}

/** Pasos 3 a 5: marca la exposición como cancelada. Sus piezas quedan liberadas: la lista se conserva como registro. */
export async function cancelarExposicion(id: string): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  const exposicion = await exposicionVisible(datos, usuario, id);
  if (!exposicion) return { ok: false, error: "No se encontró la exposición" };
  if (exposicion.estado === "finalizada" || exposicion.estado === "cancelada") {
    return { ok: false, error: "No es posible cancelar esta exposición" };
  }
  await datos.cancelarExposicion(id);
  revalidatePath("/exposiciones");
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Exposición cancelada correctamente" };
}
