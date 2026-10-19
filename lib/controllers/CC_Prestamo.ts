"use server";

import { revalidatePath } from "next/cache";
import { exigirSesion } from "../auth/session";
import {
  CAMPO_DISPONIBILIDAD,
  CAMPO_ESTADO_CONSERVACION,
  ESTADOS_CONSERVACION,
  MAXIMO_INSTITUCION_DESTINO,
  MAXIMO_NUMERO_CONVENIO,
  MAXIMO_NUMERO_POLIZA,
  MAXIMO_RESPONSABLE_RECEPTOR,
  MENSAJE_CONVENIO_LARGO,
  MENSAJE_PRESTAMO_ESTADO_DEVOLUCION,
  MENSAJE_INSTITUCION_LARGA,
  MENSAJE_POLIZA_LARGA,
  MENSAJE_PRESTAMO_DEVOLUCION_LIMITE,
  MENSAJE_PRESTAMO_SALIDA_FUTURA,
  MENSAJE_RESPONSABLE_LARGO,
  MENSAJE_PIEZA_NO_ENCONTRADA,
} from "../constantes";
import { obtenerDatos } from "../data";
import { fechaLimite, hoyISO, rangoExposicion, rangosSeCruzan } from "../fechas";
import { validarValorAsegurado } from "../validaciones";
import type { Categoria, EstadoConservacion, Museo, PrestamoListado, Resultado } from "../tipos";
import { exposicionesVisibles, museosVisibles, piezasVisibles, prestamosVisibles } from "./acceso";

/* ECUS06: Registrar Préstamo de una Pieza */

const MENSAJE_INCOMPLETO =
  "Complete todos los campos y verifique que la fecha de devolución sea posterior a la fecha de salida";
const MENSAJE_NO_DISPONIBLE = "La pieza no está disponible en las fechas indicadas";

/* Módulo de préstamos */

export async function cargarPrestamos(): Promise<PrestamoListado[]> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return prestamosVisibles(datos, usuario);
}

/* Nuevo préstamo */

/** Datos del formulario: museos y categorías para el popup de buscar piezas, y la fecha de hoy del servidor para la fecha de salida. */
export async function cargarFormularioPrestamo(): Promise<{ museos: Museo[]; categorias: Categoria[]; hoy: string; limite: string }> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return {
    museos: await museosVisibles(datos, usuario),
    categorias: await datos.listarCategorias(usuario.organizacionId),
    hoy: hoyISO(),
    limite: fechaLimite(),
  };
}

export async function registrarPrestamo(entrada: {
  piezaId: string;
  institucionDestino: string;
  responsableReceptor: string;
  numeroConvenio: string;
  numeroPoliza: string;
  valorAsegurado: string;
  fechaSalida: string;
  fechaDevolucionPrevista: string;
}): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();

  // Paso 8: todos los campos completos y fecha de devolución prevista posterior a la de salida
  const institucionDestino = entrada.institucionDestino.trim();
  const responsableReceptor = entrada.responsableReceptor.trim();
  const numeroConvenio = entrada.numeroConvenio.trim();
  const numeroPoliza = entrada.numeroPoliza.trim();
  if (
    !entrada.piezaId ||
    !institucionDestino ||
    !responsableReceptor ||
    !numeroConvenio ||
    !numeroPoliza ||
    entrada.valorAsegurado.trim() === "" ||
    !entrada.fechaSalida ||
    !entrada.fechaDevolucionPrevista ||
    entrada.fechaDevolucionPrevista <= entrada.fechaSalida
  ) {
    return { ok: false, error: MENSAJE_INCOMPLETO };
  }

  // La fecha de salida no puede ser posterior a hoy
  if (entrada.fechaSalida > hoyISO()) return { ok: false, error: MENSAJE_PRESTAMO_SALIDA_FUTURA };

  // La devolución prevista no puede superar el límite de años desde hoy
  if (entrada.fechaDevolucionPrevista > fechaLimite()) return { ok: false, error: MENSAJE_PRESTAMO_DEVOLUCION_LIMITE };

  // Longitud de los textos
  if (institucionDestino.length > MAXIMO_INSTITUCION_DESTINO) return { ok: false, error: MENSAJE_INSTITUCION_LARGA };
  if (responsableReceptor.length > MAXIMO_RESPONSABLE_RECEPTOR) return { ok: false, error: MENSAJE_RESPONSABLE_LARGO };
  if (numeroConvenio.length > MAXIMO_NUMERO_CONVENIO) return { ok: false, error: MENSAJE_CONVENIO_LARGO };
  if (numeroPoliza.length > MAXIMO_NUMERO_POLIZA) return { ok: false, error: MENSAJE_POLIZA_LARGA };

  // Valor asegurado
  const validacionValor = validarValorAsegurado(entrada.valorAsegurado);
  if (!validacionValor.ok) return { ok: false, error: validacionValor.error };
  const valorAsegurado = validacionValor.valor;

  const pieza = (await piezasVisibles(datos, usuario)).find((p) => p.id === entrada.piezaId);
  if (!pieza) return { ok: false, error: MENSAJE_PIEZA_NO_ENCONTRADA };

  // Paso 9: la pieza debe estar disponible y sin exposiciones activas con fechas que se crucen con el préstamo
  const rango = { inicio: entrada.fechaSalida, fin: entrada.fechaDevolucionPrevista };
  const exposiciones = await exposicionesVisibles(datos, usuario);
  const hayCruce = exposiciones.some(
    (e) => e.estado !== "cancelada" && e.piezaIds.includes(pieza.id) && rangosSeCruzan(rangoExposicion(e), rango),
  );
  if (pieza.disponibilidad !== "disponible" || hayCruce) {
    return { ok: false, error: MENSAJE_NO_DISPONIBLE };
  }

  // Paso 10: el estado de salida se toma del estado actual de la pieza, que pasa a "en préstamo"
  await datos.crearPrestamo(usuario.organizacionId, {
    piezaId: pieza.id,
    usuarioId: usuario.id,
    institucionDestino,
    responsableReceptor,
    numeroConvenio,
    numeroPoliza,
    valorAsegurado,
    fechaSalida: entrada.fechaSalida,
    fechaDevolucionPrevista: entrada.fechaDevolucionPrevista,
    estadoConservacionSalida: pieza.estadoConservacion,
  });
  await datos.actualizarDisponibilidadPieza(usuario.organizacionId, pieza.id, "en_prestamo");
  // Paso 11: el cambio queda en el historial de la pieza
  await datos.registrarCambio(usuario.organizacionId, {
    piezaId: pieza.id,
    usuarioId: usuario.id,
    campoModificado: CAMPO_DISPONIBILIDAD,
    valorAnterior: "disponible",
    valorNuevo: "en_prestamo",
  });
  revalidatePath("/prestamos");
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Préstamo registrado correctamente" };
}

/* Sub flujo: registrar devolución */

/** Paso 1: lista de préstamos vigentes (En préstamo o Vencido). */
export async function cargarDevolucion(): Promise<PrestamoListado[]> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();
  return (await prestamosVisibles(datos, usuario)).filter((p) => !p.fechaDevolucionReal);
}

export async function registrarDevolucionPrestamo(prestamoId: string, estado: string): Promise<Resultado> {
  const usuario = await exigirSesion();
  const datos = await obtenerDatos();

  const prestamo = (await prestamosVisibles(datos, usuario)).find((p) => p.id === prestamoId);
  if (!prestamo) return { ok: false, error: "No se encontró el préstamo" };
  if (prestamo.fechaDevolucionReal) return { ok: false, error: "No existen préstamos vigentes" };
  if (!(ESTADOS_CONSERVACION as readonly string[]).includes(estado)) {
    return { ok: false, error: MENSAJE_PRESTAMO_ESTADO_DEVOLUCION };
  }
  const estadoDevolucion = estado as EstadoConservacion;

  const pieza = await datos.obtenerPieza(usuario.organizacionId, prestamo.piezaId);
  if (!pieza) return { ok: false, error: MENSAJE_PIEZA_NO_ENCONTRADA };

  // Paso 5: fecha real de devolución (hoy), estado de devolución, estado de la pieza y disponibilidad
  await datos.registrarDevolucion(usuario.organizacionId, prestamo.id, {
    fechaDevolucionReal: hoyISO(),
    estadoConservacionDevolucion: estadoDevolucion,
  });
  // Paso 6: cada cambio queda en el historial de la pieza (el de estado solo si cambia, como en ECUS03)
  if (pieza.estadoConservacion !== estadoDevolucion) {
    await datos.actualizarEstadoPieza(usuario.organizacionId, pieza.id, estadoDevolucion);
    await datos.registrarCambio(usuario.organizacionId, {
      piezaId: pieza.id,
      usuarioId: usuario.id,
      campoModificado: CAMPO_ESTADO_CONSERVACION,
      valorAnterior: pieza.estadoConservacion,
      valorNuevo: estadoDevolucion,
    });
  }
  await datos.actualizarDisponibilidadPieza(usuario.organizacionId, pieza.id, "disponible");
  await datos.registrarCambio(usuario.organizacionId, {
    piezaId: pieza.id,
    usuarioId: usuario.id,
    campoModificado: CAMPO_DISPONIBILIDAD,
    valorAnterior: "en_prestamo",
    valorNuevo: "disponible",
  });
  revalidatePath("/prestamos");
  revalidatePath("/piezas");
  return { ok: true, mensaje: "Devolución registrada correctamente" };
}
