import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CORREOS_RETIRADOS } from "../lib/datosDemo";
import { calcularPrefijoMuseo, claveCodigoAnterior, formatearCodigo, MAXIMO_CODIGO_ANTERIOR } from "../lib/codigos";
import {
  obtenerCargaAdminEmail,
  obtenerCargaColaboradorEmail,
  obtenerCargaContrasena,
  obtenerDatabaseUrl,
  obtenerSupabaseServiceRoleKey,
  obtenerSupabaseUrl,
} from "../lib/config/env";
import {
  DISPONIBILIDADES,
  ESTADOS_CONSERVACION,
  MAXIMO_INSTITUCION_DESTINO,
  MAXIMO_NUMERO_CONVENIO,
  MAXIMO_NUMERO_POLIZA,
  MAXIMO_RESPONSABLE_RECEPTOR,
  RESULTADOS_INVENTARIO,
  ROLES,
  TIPOS_COLECCION,
} from "../lib/constantes";
import {
  diaLocal,
  diasDesdeHoy,
  estadoExposicion,
  fechaLimite,
  hoyISO,
  instanteDeLima,
  rangoExposicion,
  rangosSeCruzan,
  situacionPrestamo,
} from "../lib/fechas";
import { CONTRASENA_MAXIMO, anioEnRango, errorDeLongitudContrasena, esCorreoValido, VALOR_ASEGURADO_MAXIMO } from "../lib/validaciones";
import * as datos from "./datosCarga";

/*
 * Carga inicial de la base de datos. Dos modos: simular (no se conecta a nada) y cargar (escribe).
 * Excepción a la regla de process.env solo en lib/config/env.ts: este script corre fuera de Next,
 * que no carga .env.local, y la limpieza de errores necesita conocer los valores secretos para ocultarlos.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local las variables deben venir del entorno
}

/* Limpieza de errores: nunca se imprime una clave, contraseña, cadena, correo ni servidor */

const VARIABLES_SECRETAS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CARGA_ADMIN_EMAIL",
  "CARGA_COLABORADOR_EMAIL",
  "CARGA_CONTRASENA",
] as const;

function fragmentosSecretos(): { fragmentos: string[]; completo: boolean } {
  const fragmentos: string[] = [];
  let completo = true;
  for (const nombre of VARIABLES_SECRETAS) {
    const valor = process.env[nombre];
    if (!valor) continue;
    fragmentos.push(valor);
    try {
      const url = new URL(valor);
      for (const parte of [url.username, url.password, url.hostname, url.host]) {
        if (!parte) continue;
        fragmentos.push(parte);
        try {
          fragmentos.push(decodeURIComponent(parte));
        } catch {
          completo = false;
        }
      }
    } catch {
      // No es una URL (clave, correo o contraseña): ya se agregó completa
    }
  }
  return { fragmentos: fragmentos.filter((f) => f.length > 0), completo };
}

/** Mensaje seguro de un error: siempre el tipo, y el detalle solo si queda sin ningún fragmento secreto. */
function describirError(error: unknown): string {
  const e = (error ?? {}) as { name?: string; code?: unknown; status?: unknown; message?: unknown };
  const marca = [e.code, e.status].filter((x) => x !== undefined && x !== null && x !== "").map(String).join(" ");
  const tipo = `${e.name ?? "Error"}${marca ? ` (${marca})` : ""}`;
  const { fragmentos, completo } = fragmentosSecretos();
  let detalle = (typeof e.message === "string" ? e.message : "").split("\n").find((l) => l.trim())?.trim() ?? "";
  for (const f of [...fragmentos].sort((a, b) => b.length - a.length)) {
    detalle = detalle.split(f).join("[oculto]").split(f.toLowerCase()).join("[oculto]");
  }
  detalle = detalle
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[oculto]")
    .replace(/[^\s@]+@[^\s@]+/g, "[oculto]")
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]*/g, "[oculto]")
    .replace(/\bsb_\w+/g, "[oculto]")
    .replace(/\b\d{1,3}(\.\d{1,3}){3}\b/g, "[oculto]")
    .replace(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/gi, "[oculto]");
  const limpio = completo && !fragmentos.some((f) => detalle.toLowerCase().includes(f.toLowerCase()));
  return `Tipo de error: ${tipo}.${limpio && detalle && detalle.length <= 160 ? ` Detalle: ${detalle}` : ""}`;
}

/* Construcción de las filas: ids, prefijos, códigos y fechas se calculan aquí */

type FilaMuseo = { id: string; organizacionId: string; nombre: string; prefijo: string; ultimoCorrelativo: number; tipo: string };
type FilaUsuario = { id: string; organizacionId: string; nombre: string; email: string; rol: string; activo: boolean };
type FilaPieza = {
  id: string;
  museoId: string;
  categoriaId: string;
  codigo: string;
  codigoAnterior: string | null;
  nombre: string;
  descripcion: string | null;
  anio: number | null;
  material: string | null;
  estadoConservacion: string;
  ubicacionFisica: string;
  disponibilidad: string;
  fechaRegistro: string;
};
type FilaCambio = { id: string; piezaId: string; usuarioId: string; campoModificado: string; valorAnterior: string; valorNuevo: string; fecha: string };
type FilaExposicion = { id: string; museoId: string; nombre: string; descripcion: string; fechaInicio: string; fechaFin: string; cancelada: boolean };
type FilaPrestamo = {
  id: string;
  piezaId: string;
  usuarioId: string;
  institucionDestino: string;
  responsableReceptor: string;
  numeroConvenio: string;
  numeroPoliza: string;
  valorAsegurado: number;
  fechaSalida: string;
  fechaDevolucionPrevista: string;
  fechaDevolucionReal: string | null;
  estadoConservacionSalida: string;
  estadoConservacionDevolucion: string | null;
};
type FilaInventario = {
  id: string;
  museoId: string;
  usuarioId: string;
  usuarioCierreId: string | null;
  fechaInicio: string;
  fechaCierre: string | null;
  estado: string;
};
type FilaDetalle = { id: string; inventarioId: string; piezaId: string; resultado: string; observacion: string | null };

type Filas = {
  organizacionId: string;
  museos: FilaMuseo[];
  usuarios: FilaUsuario[];
  usuarioMuseo: { usuarioId: string; museoId: string }[];
  categorias: { id: string; organizacionId: string; nombre: string }[];
  piezas: FilaPieza[];
  historial: FilaCambio[];
  exposiciones: FilaExposicion[];
  piezaExposicion: { piezaId: string; exposicionId: string }[];
  prestamos: FilaPrestamo[];
  inventarios: FilaInventario[];
  detalles: FilaDetalle[];
};

const diaHace = (dias: number) => diasDesdeHoy(-dias);

/** Construye todas las filas. idsUsuario: id real (o de simulación) de cada usuario por clave. */
function construir(idsUsuario: Record<string, string>, correos: Record<string, string>): Filas {
  const organizacionId = randomUUID();
  const idMuseo: Record<string, string> = {};
  const idPieza: Record<string, string> = {};
  const idExposicion: Record<string, string> = {};
  const idInventario: Record<string, string> = {};

  // Prefijos con la misma regla que usa el registro de museos
  const asignados: string[] = [];
  const museos: FilaMuseo[] = datos.MUSEOS.map((m) => {
    const prefijo = calcularPrefijoMuseo(m.nombre, asignados);
    asignados.push(prefijo);
    idMuseo[m.clave] = randomUUID();
    return { id: idMuseo[m.clave], organizacionId, nombre: m.nombre, prefijo, ultimoCorrelativo: 0, tipo: m.tipo };
  });

  const usuarios: FilaUsuario[] = datos.USUARIOS.map((u) => ({
    id: idsUsuario[u.clave],
    organizacionId,
    nombre: u.nombre,
    email: correos[u.clave],
    rol: u.rol,
    activo: true,
  }));
  const usuarioMuseo = datos.USUARIOS.flatMap((u) => u.museos.map((m) => ({ usuarioId: idsUsuario[u.clave], museoId: idMuseo[m] })));

  const categorias = datos.CATEGORIAS.map((nombre) => ({ id: randomUUID(), organizacionId, nombre }));

  // El número del código es el orden de la pieza dentro de su museo
  const contador: Record<string, number> = {};
  const piezas: FilaPieza[] = datos.PIEZAS.map((p) => {
    const museo = museos.find((m) => m.id === idMuseo[p.museo])!;
    contador[p.museo] = (contador[p.museo] ?? 0) + 1;
    idPieza[p.clave] = randomUUID();
    return {
      id: idPieza[p.clave],
      museoId: museo.id,
      categoriaId: categorias.find((c) => c.nombre === p.categoria)?.id ?? "",
      codigo: formatearCodigo(museo.prefijo, contador[p.museo]),
      codigoAnterior: p.codigoAnterior ?? null,
      nombre: p.nombre,
      descripcion: p.descripcion ?? null,
      anio: p.anio ?? null,
      material: p.material ?? null,
      estadoConservacion: p.estado,
      ubicacionFisica: p.ubicacion,
      disponibilidad: p.disponibilidad,
      fechaRegistro: instanteDeLima(diaHace(p.registroHace), 10),
    };
  });
  for (const m of museos) m.ultimoCorrelativo = contador[datos.MUSEOS.find((x) => idMuseo[x.clave] === m.id)!.clave] ?? 0;

  const historial: FilaCambio[] = datos.HISTORIAL.map((h) => ({
    id: randomUUID(),
    piezaId: idPieza[h.pieza],
    usuarioId: idsUsuario[h.usuario],
    campoModificado: h.campo,
    valorAnterior: h.anterior,
    valorNuevo: h.nuevo,
    fecha: instanteDeLima(diaHace(h.hace), h.hora),
  }));

  const exposiciones: FilaExposicion[] = datos.EXPOSICIONES.map((e) => {
    idExposicion[e.clave] = randomUUID();
    return {
      id: idExposicion[e.clave],
      museoId: idMuseo[e.museo],
      nombre: e.nombre,
      descripcion: e.descripcion,
      fechaInicio: diasDesdeHoy(e.inicioEnDias),
      fechaFin: diasDesdeHoy(e.finEnDias),
      cancelada: e.cancelada,
    };
  });
  const piezaExposicion = datos.EXPOSICIONES.flatMap((e) => e.piezas.map((p) => ({ piezaId: idPieza[p], exposicionId: idExposicion[e.clave] })));

  const prestamos: FilaPrestamo[] = datos.PRESTAMOS.map((p) => ({
    id: randomUUID(),
    piezaId: idPieza[p.pieza],
    usuarioId: idsUsuario[p.usuario],
    institucionDestino: p.institucion,
    responsableReceptor: p.responsable,
    numeroConvenio: p.convenio,
    numeroPoliza: p.poliza,
    valorAsegurado: p.valor,
    fechaSalida: diaHace(p.salidaHace),
    fechaDevolucionPrevista: diasDesdeHoy(p.previstaEnDias),
    fechaDevolucionReal: p.realHace === undefined ? null : diaHace(p.realHace),
    estadoConservacionSalida: p.estadoSalida,
    estadoConservacionDevolucion: p.estadoDevolucion ?? null,
  }));

  const inventarios: FilaInventario[] = datos.INVENTARIOS.map((i) => {
    idInventario[i.clave] = randomUUID();
    return {
      id: idInventario[i.clave],
      museoId: idMuseo[i.museo],
      usuarioId: idsUsuario[i.inicia],
      usuarioCierreId: i.cierra ? idsUsuario[i.cierra] : null,
      fechaInicio: instanteDeLima(diaHace(i.inicioHace), i.inicioHora),
      fechaCierre: i.cierreHace === undefined ? null : instanteDeLima(diaHace(i.cierreHace), i.cierreHora ?? 12),
      estado: i.estado,
    };
  });
  const detalles: FilaDetalle[] = datos.DETALLES.map((d) => ({
    id: randomUUID(),
    inventarioId: idInventario[d.inventario],
    piezaId: idPieza[d.pieza],
    resultado: d.resultado,
    observacion: d.observacion ?? null,
  }));

  return { organizacionId, museos, usuarios, usuarioMuseo, categorias, piezas, historial, exposiciones, piezaExposicion, prestamos, inventarios, detalles };
}

/* Validaciones: claves foráneas y restricciones de prisma/sql/01 y 02 */

function validarTablas(f: Filas): string[] {
  const errores: string[] = [];
  const err = (m: string) => errores.push(m);
  const ids = (filas: { id: string }[]) => new Set(filas.map((x) => x.id));
  const museoIds = ids(f.museos);
  const usuarioIds = ids(f.usuarios);
  const piezaIds = ids(f.piezas);
  const categoriaIds = ids(f.categorias);
  const exposicionIds = ids(f.exposiciones);
  const inventarioIds = ids(f.inventarios);
  const hoy = hoyISO();
  const limite = fechaLimite();
  const unico = (etiqueta: string, claves: string[]) => {
    if (new Set(claves).size !== claves.length) err(`${etiqueta}: hay valores repetidos`);
  };

  // Claves foráneas
  for (const m of f.museos) if (m.organizacionId !== f.organizacionId) err(`museo ${m.prefijo}: organización inexistente`);
  for (const u of f.usuarios) if (u.organizacionId !== f.organizacionId) err("usuario: organización inexistente");
  for (const x of f.usuarioMuseo) {
    if (!usuarioIds.has(x.usuarioId) || !museoIds.has(x.museoId)) err("usuario_museo: referencia inexistente");
  }
  for (const c of f.categorias) if (c.organizacionId !== f.organizacionId) err("categoria: organización inexistente");
  for (const p of f.piezas) {
    if (!museoIds.has(p.museoId)) err(`pieza ${p.codigo}: museo inexistente`);
    if (!categoriaIds.has(p.categoriaId)) err(`pieza ${p.codigo}: categoría inexistente`);
  }
  for (const h of f.historial) {
    if (!piezaIds.has(h.piezaId) || !usuarioIds.has(h.usuarioId)) err("historial_cambio: referencia inexistente");
  }
  for (const e of f.exposiciones) if (!museoIds.has(e.museoId)) err(`exposicion ${e.nombre}: museo inexistente`);
  for (const x of f.piezaExposicion) {
    if (!piezaIds.has(x.piezaId) || !exposicionIds.has(x.exposicionId)) err("pieza_exposicion: referencia inexistente");
  }
  for (const p of f.prestamos) {
    if (!piezaIds.has(p.piezaId) || !usuarioIds.has(p.usuarioId)) err("prestamo: referencia inexistente");
  }
  for (const i of f.inventarios) {
    if (!museoIds.has(i.museoId) || !usuarioIds.has(i.usuarioId)) err("inventario: referencia inexistente");
    if (i.usuarioCierreId && !usuarioIds.has(i.usuarioCierreId)) err("inventario: persona de cierre inexistente");
  }
  for (const d of f.detalles) {
    if (!inventarioIds.has(d.inventarioId) || !piezaIds.has(d.piezaId)) err("detalle_inventario: referencia inexistente");
  }

  // Patrones y valores fijos
  for (const m of f.museos) {
    if (!/^[A-Z0-9]+$/.test(m.prefijo)) err(`museo ${m.nombre}: prefijo fuera del patrón`);
    if (!(TIPOS_COLECCION as readonly string[]).includes(m.tipo)) err(`museo ${m.nombre}: tipo no válido`);
    if (m.ultimoCorrelativo < 0) err(`museo ${m.nombre}: ultimo_correlativo negativo`);
  }
  for (const u of f.usuarios) {
    if (!(ROLES as readonly string[]).includes(u.rol)) err("usuario: rol no válido");
    if (!u.nombre.trim()) err("usuario: nombre vacío");
  }
  for (const p of f.piezas) {
    if (!/^[A-Z0-9]+-[0-9]+$/.test(p.codigo)) err(`pieza ${p.codigo}: código fuera del patrón`);
    if (p.codigoAnterior !== null && p.codigoAnterior.length > MAXIMO_CODIGO_ANTERIOR) err(`pieza ${p.codigo}: código anterior largo`);
    if (p.anio !== null && !anioEnRango(p.anio)) err(`pieza ${p.codigo}: año fuera de rango`);
    if (!(ESTADOS_CONSERVACION as readonly string[]).includes(p.estadoConservacion)) err(`pieza ${p.codigo}: estado no válido`);
    if (!(DISPONIBILIDADES as readonly string[]).includes(p.disponibilidad)) err(`pieza ${p.codigo}: disponibilidad no válida`);
    if (!p.nombre.trim()) err(`pieza ${p.codigo}: nombre vacío`);
  }
  for (const e of f.exposiciones) {
    if (!(e.fechaFin > e.fechaInicio)) err(`exposicion ${e.nombre}: fin no posterior a inicio`);
    if (e.fechaInicio > limite || e.fechaFin > limite) err(`exposicion ${e.nombre}: fecha más allá del límite de años`);
  }
  for (const p of f.prestamos) {
    if (!(p.fechaDevolucionPrevista > p.fechaSalida)) err("prestamo: devolución prevista no posterior a la salida");
    if (p.fechaSalida > hoy) err("prestamo: salida futura");
    if (p.fechaDevolucionPrevista > limite) err("prestamo: devolución prevista más allá del límite de años");
    if (!(p.valorAsegurado > 0 && p.valorAsegurado <= VALOR_ASEGURADO_MAXIMO)) err("prestamo: valor asegurado fuera de rango");
    if (!/^\d+(\.\d{1,2})?$/.test(String(p.valorAsegurado))) err("prestamo: valor asegurado con más de 2 decimales");
    if (p.institucionDestino.length > MAXIMO_INSTITUCION_DESTINO) err("prestamo: institución destino larga");
    if (p.responsableReceptor.length > MAXIMO_RESPONSABLE_RECEPTOR) err("prestamo: responsable largo");
    if (p.numeroConvenio.length > MAXIMO_NUMERO_CONVENIO) err("prestamo: convenio largo");
    if (p.numeroPoliza.length > MAXIMO_NUMERO_POLIZA) err("prestamo: póliza larga");
    if (!(ESTADOS_CONSERVACION as readonly string[]).includes(p.estadoConservacionSalida)) err("prestamo: estado de salida no válido");
    if (p.estadoConservacionDevolucion !== null && !(ESTADOS_CONSERVACION as readonly string[]).includes(p.estadoConservacionDevolucion)) {
      err("prestamo: estado de devolución no válido");
    }
    if ((p.fechaDevolucionReal === null) !== (p.estadoConservacionDevolucion === null)) err("prestamo: fecha y estado de devolución deben ir juntos");
  }
  for (const i of f.inventarios) {
    const cerradoOk = i.estado === "cerrado" && i.fechaCierre !== null && i.usuarioCierreId !== null;
    const cursoOk = i.estado === "en_curso" && i.fechaCierre === null && i.usuarioCierreId === null;
    if (!cerradoOk && !cursoOk) err("inventario: cierre incoherente con su estado");
    if (i.fechaCierre !== null && i.fechaCierre < i.fechaInicio) err("inventario: cierre anterior al inicio");
  }
  for (const d of f.detalles) {
    if (!(RESULTADOS_INVENTARIO as readonly string[]).includes(d.resultado)) err("detalle_inventario: resultado no válido");
  }

  // Únicos simples y de las reglas
  unico("categoria (organización, nombre)", f.categorias.map((c) => c.nombre));
  unico("museo (organización, prefijo)", f.museos.map((m) => m.prefijo));
  unico("museo (organización, nombre sin mayúsculas)", f.museos.map((m) => m.nombre.trim().toLowerCase()));
  unico("usuario (correo sin mayúsculas)", f.usuarios.map((u) => u.email.toLowerCase()));
  unico("detalle_inventario (inventario, pieza)", f.detalles.map((d) => `${d.inventarioId}|${d.piezaId}`));
  for (const m of f.museos) {
    const delMuseo = f.piezas.filter((p) => p.museoId === m.id);
    unico(`pieza (museo ${m.prefijo}, código)`, delMuseo.map((p) => p.codigo));
    unico(
      `pieza (museo ${m.prefijo}, código anterior normalizado)`,
      delMuseo.filter((p) => p.codigoAnterior !== null).map((p) => claveCodigoAnterior(p.codigoAnterior as string)),
    );
    const mayor = Math.max(0, ...delMuseo.map((p) => Number(p.codigo.split("-").pop())));
    if (m.ultimoCorrelativo !== mayor) err(`museo ${m.prefijo}: ultimo_correlativo no es el mayor número de código`);
    if (f.inventarios.filter((i) => i.museoId === m.id && i.estado === "en_curso").length > 1) err(`museo ${m.prefijo}: más de un inventario en curso`);
  }
  unico("prestamo abierto por pieza", f.prestamos.filter((p) => p.fechaDevolucionReal === null).map((p) => p.piezaId));
  return errores;
}

/* Las 10 reglas de consistencia de la sección 2.4 de AJUSTES_CODIGO_V2.md, con la precisión sobre la regla 5 */

type ResultadoRegla = { regla: number; descripcion: string; errores: string[] };

function comprobarReglas(f: Filas): ResultadoRegla[] {
  const pieza = (id: string) => f.piezas.find((p) => p.id === id)!;
  const museoDe = (piezaId: string) => pieza(piezaId).museoId;
  const accede = (usuarioId: string, museoId: string) => f.usuarioMuseo.some((x) => x.usuarioId === usuarioId && x.museoId === museoId);
  const abiertos = f.prestamos.filter((p) => p.fechaDevolucionReal === null);
  const rangoPrestamo = (p: FilaPrestamo) => ({ inicio: p.fechaSalida, fin: p.fechaDevolucionPrevista });
  const rangoExp = (e: FilaExposicion) => rangoExposicion({ fechaInicio: e.fechaInicio, fechaFin: e.fechaFin });
  const activas = f.exposiciones.filter((e) => !e.cancelada);
  const piezasDe = (e: FilaExposicion) => f.piezaExposicion.filter((x) => x.exposicionId === e.id).map((x) => x.piezaId);
  const resultados: ResultadoRegla[] = [];
  const regla = (n: number, descripcion: string, errores: string[]) => resultados.push({ regla: n, descripcion, errores });

  // 1
  const e1: string[] = [];
  for (const e of f.exposiciones) for (const id of piezasDe(e)) if (museoDe(id) !== e.museoId) e1.push(`${pieza(id).codigo} en una exposición de otro museo`);
  regla(1, "Las piezas de una exposición son del museo de la exposición", e1);

  // 2, con el estado de salida del préstamo abierto igual al actual de la pieza
  const e2: string[] = [];
  for (const p of f.piezas) {
    const n = abiertos.filter((x) => x.piezaId === p.id).length;
    if (p.disponibilidad === "en_prestamo" && n !== 1) e2.push(`${p.codigo} en préstamo con ${n} préstamos abiertos`);
    if (p.disponibilidad !== "en_prestamo" && n > 0) e2.push(`${p.codigo} con préstamo abierto sin estar en préstamo`);
  }
  for (const pr of abiertos) if (pr.estadoConservacionSalida !== pieza(pr.piezaId).estadoConservacion) e2.push(`${pieza(pr.piezaId).codigo}: estado de salida distinto del actual`);
  regla(2, "Pieza en préstamo tiene exactamente un préstamo abierto, y solo ellas", e2);

  // 3
  const e3: string[] = [];
  for (const pr of abiertos) {
    for (const e of activas) {
      if (piezasDe(e).includes(pr.piezaId) && rangosSeCruzan(rangoExp(e), rangoPrestamo(pr))) e3.push(`${pieza(pr.piezaId).codigo} cruza con la exposición ${e.nombre}`);
    }
  }
  regla(3, "Pieza con préstamo abierto no está en una exposición activa con fechas cruzadas", e3);

  // 4
  const e4: string[] = [];
  for (let i = 0; i < activas.length; i++) {
    for (let j = i + 1; j < activas.length; j++) {
      const comunes = piezasDe(activas[i]).filter((id) => piezasDe(activas[j]).includes(id));
      if (comunes.length > 0 && rangosSeCruzan(rangoExp(activas[i]), rangoExp(activas[j]))) e4.push(`${activas[i].nombre} y ${activas[j].nombre} comparten piezas con fechas cruzadas`);
    }
  }
  regla(4, "Ninguna pieza está en dos exposiciones activas con fechas cruzadas", e4);

  // 5, con la precisión: si hay un préstamo abierto posterior sobre la misma pieza, la pieza está en préstamo
  const e5: string[] = [];
  const cerrados = f.prestamos.filter((p) => p.fechaDevolucionReal !== null);
  for (const pr of cerrados) {
    const p = pieza(pr.piezaId);
    if (pr.estadoConservacionDevolucion === null) e5.push(`${p.codigo}: préstamo cerrado sin estado de devolución`);
    const posterior = abiertos.find((x) => x.piezaId === pr.piezaId && x.fechaSalida >= (pr.fechaDevolucionReal as string));
    if (posterior) {
      if (p.disponibilidad !== "en_prestamo") e5.push(`${p.codigo}: tiene un préstamo abierto posterior y no está en préstamo`);
      if (posterior.estadoConservacionSalida !== pr.estadoConservacionDevolucion) e5.push(`${p.codigo}: el estado de salida del préstamo posterior no continúa el de la devolución`);
    } else {
      if (p.disponibilidad !== "disponible") e5.push(`${p.codigo}: préstamo cerrado y la pieza no está disponible`);
      const masReciente = cerrados.filter((x) => x.piezaId === pr.piezaId).sort((a, b) => (b.fechaDevolucionReal as string).localeCompare(a.fechaDevolucionReal as string))[0];
      if (masReciente === pr && p.estadoConservacion !== pr.estadoConservacionDevolucion) e5.push(`${p.codigo}: su estado no coincide con el de la devolución`);
    }
  }
  regla(5, "Préstamo cerrado con fecha y estado de devolución, y pieza coherente (con la precisión de un préstamo posterior abierto)", e5);

  // 6
  const e6: string[] = [];
  const cerradosInv = f.inventarios.filter((i) => i.estado === "cerrado");
  const noEncontradas = new Set(
    f.detalles.filter((d) => d.resultado === "no_encontrada" && cerradosInv.some((i) => i.id === d.inventarioId)).map((d) => d.piezaId),
  );
  for (const p of f.piezas) {
    const pendiente = p.disponibilidad === "pendiente_verificacion";
    if (pendiente !== noEncontradas.has(p.id)) e6.push(`${p.codigo}: pendiente de verificación no coincide con un inventario cerrado`);
  }
  regla(6, "Pendiente de verificación es exactamente lo no encontrado en un inventario cerrado", e6);

  // 7
  const e7: string[] = [];
  const esperadas = (i: FilaInventario): Set<string> => {
    const dia = diaLocal(i.fechaInicio);
    const ids = f.piezas
      .filter((p) => p.museoId === i.museoId && diaLocal(p.fechaRegistro) <= dia)
      .filter((p) => !f.prestamos.some((x) => x.piezaId === p.id && x.fechaSalida <= dia && (x.fechaDevolucionReal === null || x.fechaDevolucionReal > dia)))
      .map((p) => p.id);
    return new Set(ids);
  };
  for (const i of f.inventarios) {
    const marcadas = f.detalles.filter((d) => d.inventarioId === i.id).map((d) => d.piezaId);
    const esp = esperadas(i);
    for (const id of marcadas) {
      if (museoDe(id) !== i.museoId) e7.push(`${pieza(id).codigo}: detalle de una pieza de otro museo`);
      else if (!esp.has(id)) e7.push(`${pieza(id).codigo}: detalle de una pieza que no era esperada`);
    }
    if (i.estado === "cerrado") {
      for (const id of esp) if (!marcadas.includes(id)) e7.push(`${pieza(id).codigo}: pieza esperada sin detalle en un inventario cerrado`);
    }
  }
  regla(7, "Inventario cerrado con un detalle por pieza esperada; en curso solo marcadas; uno en curso por museo", e7);

  // 8
  const e8: string[] = [];
  const org = f.organizacionId;
  for (const u of f.usuarios) if (u.organizacionId !== org) e8.push("usuario de otra organización");
  for (const x of f.usuarioMuseo) if (f.museos.find((m) => m.id === x.museoId)?.organizacionId !== org) e8.push("museo asignado de otra organización");
  if (new Set(f.usuarios.map((u) => u.email.toLowerCase())).size !== f.usuarios.length) e8.push("correo repetido");
  for (const m of f.museos) {
    const codigos = f.piezas.filter((p) => p.museoId === m.id).map((p) => p.codigo);
    if (new Set(codigos).size !== codigos.length) e8.push(`código repetido en ${m.prefijo}`);
  }
  regla(8, "Museos de la organización, correo único y código único por museo", e8);

  // 9
  const e9: string[] = [];
  for (const h of f.historial) {
    const p = pieza(h.piezaId);
    if (!accede(h.usuarioId, p.museoId)) e9.push(`${p.codigo}: historial de alguien sin acceso al museo`);
    if (h.fecha < p.fechaRegistro) e9.push(`${p.codigo}: historial anterior al registro de la pieza`);
  }
  for (const pr of f.prestamos) {
    const p = pieza(pr.piezaId);
    if (!accede(pr.usuarioId, p.museoId)) e9.push(`${p.codigo}: préstamo de alguien sin acceso al museo`);
    if (instanteDeLima(pr.fechaSalida, 10) < p.fechaRegistro) e9.push(`${p.codigo}: préstamo anterior al registro`);
    if (pr.fechaDevolucionReal !== null && pr.fechaDevolucionReal < pr.fechaSalida) e9.push(`${p.codigo}: devolución anterior a la salida`);
    const ent = f.historial.some((h) => h.piezaId === pr.piezaId && h.campoModificado === "disponibilidad" && h.valorNuevo === "en_prestamo" && diaLocal(h.fecha) === pr.fechaSalida);
    if (!ent) e9.push(`${p.codigo}: sin historial de la salida del préstamo`);
    if (pr.fechaDevolucionReal !== null) {
      const dev = f.historial.some((h) => h.piezaId === pr.piezaId && h.campoModificado === "disponibilidad" && h.valorNuevo === "disponible" && diaLocal(h.fecha) === pr.fechaDevolucionReal);
      if (!dev) e9.push(`${p.codigo}: sin historial de la devolución`);
    }
  }
  for (const i of f.inventarios) {
    if (!accede(i.usuarioId, i.museoId) || (i.usuarioCierreId && !accede(i.usuarioCierreId, i.museoId))) e9.push("inventario con personas sin acceso al museo");
    for (const d of f.detalles.filter((x) => x.inventarioId === i.id)) {
      if (i.fechaInicio < pieza(d.piezaId).fechaRegistro) e9.push(`${pieza(d.piezaId).codigo}: inventario anterior al registro`);
    }
  }
  regla(9, "Historial, préstamos e inventarios de personas con acceso y en el orden de los eventos", e9);

  // 10: el historial, repasado en orden, debe encadenarse y terminar en el valor actual de la pieza
  const e10: string[] = [];
  const actual = (p: FilaPieza, campo: string): string | undefined =>
    campo === "estado de conservación" ? p.estadoConservacion : campo === "disponibilidad" ? p.disponibilidad : campo === "ubicación física" ? p.ubicacionFisica : undefined;
  for (const p of f.piezas) {
    for (const campo of ["estado de conservación", "disponibilidad", "ubicación física"]) {
      const cambios = f.historial.filter((h) => h.piezaId === p.id && h.campoModificado === campo).sort((a, b) => a.fecha.localeCompare(b.fecha));
      for (let k = 1; k < cambios.length; k++) {
        if (cambios[k].valorAnterior !== cambios[k - 1].valorNuevo) e10.push(`${p.codigo}: el historial de ${campo} no se encadena`);
      }
      if (cambios.length > 0 && cambios[cambios.length - 1].valorNuevo !== actual(p, campo)) e10.push(`${p.codigo}: el historial de ${campo} no termina en el valor actual`);
    }
  }
  for (const i of cerradosInv) {
    const dia = diaLocal(i.fechaCierre as string);
    for (const d of f.detalles.filter((x) => x.inventarioId === i.id)) {
      const hay = (campo: string, nuevo: string) => f.historial.some((h) => h.piezaId === d.piezaId && h.campoModificado === campo && h.valorNuevo === nuevo && diaLocal(h.fecha) === dia);
      if (d.resultado === "no_encontrada" && !hay("disponibilidad", "pendiente_verificacion")) e10.push(`${pieza(d.piezaId).codigo}: falta el efecto del cierre (pendiente de verificación)`);
      if (d.resultado === "con_dano" && !hay("estado de conservación", "malo")) e10.push(`${pieza(d.piezaId).codigo}: falta el efecto del cierre (estado malo)`);
    }
  }
  regla(10, "Los efectos de cada evento están reflejados en el estado actual de las piezas", e10);
  return resultados;
}

/* Resumen y cuentas */

const TABLAS = [
  "organizacion",
  "museo",
  "usuario",
  "usuario_museo",
  "categoria",
  "pieza",
  "historial_cambio",
  "exposicion",
  "pieza_exposicion",
  "prestamo",
  "inventario",
  "detalle_inventario",
] as const;

function contar(f: Filas): { tabla: string; filas: number }[] {
  const n = [1, f.museos.length, f.usuarios.length, f.usuarioMuseo.length, f.categorias.length, f.piezas.length, f.historial.length, f.exposiciones.length, f.piezaExposicion.length, f.prestamos.length, f.inventarios.length, f.detalles.length];
  return TABLAS.map((tabla, i) => ({ tabla, filas: n[i] }));
}

/** Debe haber un administrador con todos los museos, un colaborador con dos, otro con uno y un museo que solo vea el administrador. */
function validarUsuarios(f: Filas): string[] {
  const errores: string[] = [];
  const museosDe = (usuarioId: string) => f.usuarioMuseo.filter((x) => x.usuarioId === usuarioId).length;
  const colaboradores = f.usuarios.filter((u) => u.rol === "colaborador");
  const administradores = f.usuarios.filter((u) => u.rol === "administrador");
  if (administradores.length !== 1 || museosDe(administradores[0].id) !== f.museos.length) errores.push("el administrador debe tener asignados todos los museos");
  if (!colaboradores.some((u) => museosDe(u.id) === 2)) errores.push("falta un colaborador con dos museos");
  if (!colaboradores.some((u) => museosDe(u.id) === 1)) errores.push("falta un colaborador con un museo");
  for (const u of f.usuarios) if (museosDe(u.id) === 0) errores.push("hay un usuario sin museos asignados");
  if (f.usuarios.some((u) => u.rol === "administrador" && !u.activo)) errores.push("el administrador debe estar activo");
  // Un museo que solo ve el administrador
  const soloAdmin = f.museos.filter((m) => f.usuarioMuseo.filter((x) => x.museoId === m.id).every((x) => administradores.some((a) => a.id === x.usuarioId)));
  if (soloAdmin.length === 0) errores.push("falta un museo que solo vea el administrador");
  return errores;
}

/** Valida y muestra el resultado. Devuelve true si todo está correcto. */
function revisar(f: Filas): boolean {
  const errores = [...validarTablas(f), ...validarUsuarios(f).map((e) => `usuarios: ${e}`)];
  const reglas = comprobarReglas(f);
  console.log("\nValidación de tablas (claves foráneas, patrones, check y únicos):");
  console.log(errores.length === 0 ? "   correcta" : errores.map((e) => `   ERROR ${e}`).join("\n"));
  console.log("\nReglas de consistencia:");
  for (const r of reglas) {
    console.log(`   Regla ${r.regla}: ${r.errores.length === 0 ? "correcta" : "ERRORES"} - ${r.descripcion}`);
    for (const e of r.errores) console.log(`      ${e}`);
  }
  const hoy = hoyISO();
  const estados = new Set(f.exposiciones.map((e) => estadoExposicion(e, hoy)));
  const situaciones = new Set(f.prestamos.map((p) => situacionPrestamo({ fechaDevolucionReal: p.fechaDevolucionReal ?? undefined, fechaDevolucionPrevista: p.fechaDevolucionPrevista }, hoy)));
  const faltanEstados = ["programada", "vigente", "finalizada", "cancelada"].filter((s) => !estados.has(s as never));
  const faltanSituaciones = ["en_prestamo", "vencido", "devuelto"].filter((s) => !situaciones.has(s as never));
  console.log(`\nEstados de exposición presentes: ${[...estados].join(", ")}${faltanEstados.length ? ` (faltan: ${faltanEstados.join(", ")})` : ""}`);
  console.log(`Situaciones de préstamo presentes: ${[...situaciones].join(", ")}${faltanSituaciones.length ? ` (faltan: ${faltanSituaciones.join(", ")})` : ""}`);
  console.log("\nPrefijos de los museos:");
  console.table(f.museos.map((m) => ({ museo: m.nombre, prefijo: m.prefijo, ultimo_correlativo: m.ultimoCorrelativo })));
  console.log("Filas que se cargarían por tabla:");
  console.table(contar(f));
  return errores.length === 0 && reglas.every((r) => r.errores.length === 0) && faltanEstados.length === 0 && faltanSituaciones.length === 0;
}

type Correos = { admin: string; miguel: string; contrasena: string };

/** Correo de cada usuario por clave: los de la carga vienen de las variables y los demás están en los datos. */
function correosPorUsuario(c: Correos): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const u of datos.USUARIOS) mapa[u.clave] = u.correo ?? (u.clave === "admin" ? c.admin : c.miguel);
  return mapa;
}

/** Lee y valida las variables de la carga. Devuelve los valores o la lista de problemas. */
function leerVariables(): { ok: true; correos: Correos } | { ok: false; problemas: string[] } {
  const faltan: string[] = [];
  const intentar = (nombre: string, leer: () => string): string => {
    try {
      return leer();
    } catch {
      faltan.push(nombre);
      return "";
    }
  };
  const admin = intentar("CARGA_ADMIN_EMAIL", obtenerCargaAdminEmail);
  const colaborador = intentar("CARGA_COLABORADOR_EMAIL", obtenerCargaColaboradorEmail);
  const contrasena = intentar("CARGA_CONTRASENA", obtenerCargaContrasena);
  intentar("NEXT_PUBLIC_SUPABASE_URL", obtenerSupabaseUrl);
  intentar("SUPABASE_SERVICE_ROLE_KEY", obtenerSupabaseServiceRoleKey);
  intentar("DATABASE_URL", obtenerDatabaseUrl);
  if (faltan.length > 0) {
    return { ok: false, problemas: [`Faltan variables en .env.local: ${faltan.join(", ")}. Complételas siguiendo .env.example.`] };
  }
  const problemas: string[] = [];
  if (!esCorreoValido(admin)) problemas.push("CARGA_ADMIN_EMAIL no tiene un formato de correo válido.");
  if (!esCorreoValido(colaborador)) problemas.push("CARGA_COLABORADOR_EMAIL no tiene un formato de correo válido.");
  const fijos = datos.USUARIOS.flatMap((u) => (u.correo ? [u.correo.toLowerCase()] : []));
  const propios = [admin.trim().toLowerCase(), colaborador.trim().toLowerCase()];
  const retirados = CORREOS_RETIRADOS.map((c) => c.toLowerCase());
  if (new Set([...fijos, ...propios, ...retirados]).size !== fijos.length + propios.length + retirados.length) {
    problemas.push("Los correos de la carga deben ser distintos entre sí, de los fijos de los datos y de los retirados.");
  }
  const errorClave = errorDeLongitudContrasena(contrasena);
  if (errorClave) problemas.push(`CARGA_CONTRASENA no cumple las reglas de longitud: ${errorClave.toLowerCase()}.`);
  if (problemas.length > 0) return { ok: false, problemas };
  return { ok: true, correos: { admin: admin.trim(), miguel: colaborador.trim(), contrasena } };
}

/* Cuentas de Supabase Auth: la API de administración exige la clave de servicio */

async function cuentasConEstosCorreos(supabase: SupabaseClient, correos: string[]): Promise<string[]> {
  const buscados = correos.map((c) => c.toLowerCase());
  const ids: string[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: pagina, perPage: 200 });
    if (error) throw error;
    for (const u of data.users) if (u.email && buscados.includes(u.email.toLowerCase())) ids.push(u.id);
    if (data.users.length < 200) break;
  }
  return ids;
}

async function confirmar(): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log("\nAVISO: esta carga BORRA todas las filas de las 12 tablas y las cuentas de Auth de los correos de la carga y de los retirados.");
    const respuesta = await rl.question("Escriba CARGAR para continuar, o cualquier otra cosa para salir: ");
    return respuesta.trim() === "CARGAR";
  } finally {
    rl.close();
  }
}

async function cargar(correos: Correos): Promise<void> {
  const { obtenerPrisma } = await import("../lib/data/prisma/cliente");
  const prisma = obtenerPrisma();
  const supabase = createClient(obtenerSupabaseUrl(), obtenerSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const creadas: string[] = [];
  const borrarCreadas = async () => {
    let sinBorrar = 0;
    for (const id of creadas) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) sinBorrar++;
    }
    console.log(
      creadas.length === 0
        ? "   No se había creado ninguna cuenta."
        : `   Cuentas creadas en esta ejecución y borradas: ${creadas.length - sinBorrar} de ${creadas.length}.`,
    );
  };

  const vaciar = () => [
    prisma.detalleInventario.deleteMany(),
    prisma.inventario.deleteMany(),
    prisma.prestamo.deleteMany(),
    prisma.piezaExposicion.deleteMany(),
    prisma.exposicion.deleteMany(),
    prisma.historialCambio.deleteMany(),
    prisma.pieza.deleteMany(),
    prisma.categoria.deleteMany(),
    prisma.usuarioMuseo.deleteMany(),
    prisma.museo.deleteMany(),
    prisma.usuario.deleteMany(),
    prisma.organizacion.deleteMany(),
  ];
  const dia = (d: string) => new Date(`${d}T00:00:00.000Z`);

  try {
    // Cuentas anteriores de estos correos y de los retirados: sus filas referenciadas se vacían primero, para que Auth pueda borrarlas
    const mapaCorreos = correosPorUsuario(correos);
    const anteriores = await cuentasConEstosCorreos(supabase, [...Object.values(mapaCorreos), ...CORREOS_RETIRADOS]);
    if (anteriores.length > 0) {
      console.log(`\nSe encontraron ${anteriores.length} cuenta(s) anteriores de la carga. Se vacían las tablas y se borran de Auth.`);
      await prisma.$transaction(vaciar());
      for (const id of anteriores) {
        const { error } = await supabase.auth.admin.deleteUser(id);
        if (error) throw error;
      }
    }

    // Cuentas nuevas, con el correo confirmado y sin enviar correos
    const ids: Record<string, string> = {};
    for (const u of datos.USUARIOS) {
      const { data, error } = await supabase.auth.admin.createUser({ email: mapaCorreos[u.clave], password: correos.contrasena, email_confirm: true });
      if (error || !data.user) throw error ?? new Error("Auth no devolvió la cuenta creada");
      ids[u.clave] = data.user.id;
      creadas.push(data.user.id);
    }
    console.log(`\nCuentas creadas en Supabase Auth: ${creadas.length}`);

    // Filas definitivas, con los ids reales de Auth, y una última revisión antes de escribir
    const f = construir(ids, mapaCorreos);
    if (!revisar(f)) throw new Error("La revisión de los datos falló con los ids reales");

    // Una sola transacción: vaciar todo e insertar en orden de claves foráneas
    await prisma.$transaction([
      ...vaciar(),
      prisma.organizacion.create({ data: { id: f.organizacionId, nombre: datos.NOMBRE_ORGANIZACION } }),
      prisma.museo.createMany({ data: f.museos.map((m) => ({ id: m.id, organizacionId: m.organizacionId, nombre: m.nombre, prefijo: m.prefijo, ultimoCorrelativo: m.ultimoCorrelativo, tipo: m.tipo, direccion: null, activo: true })) }),
      prisma.usuario.createMany({ data: f.usuarios.map((u) => ({ id: u.id, organizacionId: u.organizacionId, nombre: u.nombre, email: u.email.toLowerCase(), rol: u.rol, activo: u.activo })) }),
      prisma.usuarioMuseo.createMany({ data: f.usuarioMuseo }),
      prisma.categoria.createMany({ data: f.categorias }),
      prisma.pieza.createMany({
        data: f.piezas.map((p) => ({
          id: p.id,
          museoId: p.museoId,
          categoriaId: p.categoriaId,
          codigo: p.codigo,
          codigoAnterior: p.codigoAnterior,
          nombre: p.nombre,
          descripcion: p.descripcion,
          anio: p.anio,
          material: p.material,
          estadoConservacion: p.estadoConservacion,
          ubicacionFisica: p.ubicacionFisica,
          imagenUrl: null,
          disponibilidad: p.disponibilidad,
          fechaRegistro: new Date(p.fechaRegistro),
        })),
      }),
      prisma.historialCambio.createMany({ data: f.historial.map((h) => ({ ...h, fecha: new Date(h.fecha) })) }),
      prisma.exposicion.createMany({ data: f.exposiciones.map((e) => ({ ...e, fechaInicio: dia(e.fechaInicio), fechaFin: dia(e.fechaFin) })) }),
      prisma.piezaExposicion.createMany({ data: f.piezaExposicion }),
      prisma.prestamo.createMany({
        data: f.prestamos.map((p) => ({
          ...p,
          valorAsegurado: p.valorAsegurado.toFixed(2),
          fechaSalida: dia(p.fechaSalida),
          fechaDevolucionPrevista: dia(p.fechaDevolucionPrevista),
          fechaDevolucionReal: p.fechaDevolucionReal === null ? null : dia(p.fechaDevolucionReal),
        })),
      }),
      prisma.inventario.createMany({
        data: f.inventarios.map((i) => ({ ...i, fechaInicio: new Date(i.fechaInicio), fechaCierre: i.fechaCierre === null ? null : new Date(i.fechaCierre) })),
      }),
      prisma.detalleInventario.createMany({ data: f.detalles }),
    ]);

    console.log("\nCarga terminada. Filas por tabla:");
    console.table(contar(f));
    console.log(`Cuentas creadas: ${creadas.length}`);
  } catch (error) {
    console.log(`\nLa carga falló y no quedó nada a medias en las tablas. ${describirError(error)}`);
    await borrarCreadas();
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

async function principal(): Promise<void> {
  const modo = process.argv[2];
  if (modo !== "simular" && modo !== "cargar") {
    console.log("Use npm run db:simular o npm run db:cargar.");
    process.exitCode = 1;
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.log("La carga inicial no se ejecuta con NODE_ENV=production.");
    process.exitCode = 1;
    return;
  }

  const variables = leerVariables();
  let correos: Correos;
  if (variables.ok) {
    correos = variables.correos;
  } else if (modo === "cargar") {
    for (const p of variables.problemas) console.log(p);
    console.log("No se intentó nada.");
    process.exitCode = 1;
    return;
  } else {
    console.log("Aviso: faltan o no son válidas algunas variables de la carga. La simulación usa valores de relleno.");
    for (const p of variables.problemas) console.log(`   ${p}`);
    correos = { admin: "administrador.relleno@ejemplo.com", miguel: "colaborador.relleno@ejemplo.com", contrasena: "x".repeat(Math.min(12, CONTRASENA_MAXIMO)) };
  }

  const ids = Object.fromEntries(datos.USUARIOS.map((u) => [u.clave, randomUUID()]));
  const f = construir(ids, correosPorUsuario(correos));
  console.log(modo === "simular" ? "Simulación de la carga inicial (no se conecta a nada)" : "Carga inicial: revisión previa de los datos");
  const correcto = revisar(f);
  if (!correcto) {
    console.log("\nLa revisión encontró problemas. No se carga nada.");
    process.exitCode = 1;
    return;
  }
  if (modo === "simular") {
    console.log("\nSimulación correcta. No se escribió nada.");
    return;
  }
  if (!(await confirmar())) {
    console.log("No se escribió nada.");
    return;
  }
  await cargar(correos);
}

principal().catch((error) => {
  console.log(`El script se detuvo. ${describirError(error)}`);
  process.exitCode = 1;
});
