import { randomUUID } from "node:crypto";
import { MENSAJE_CODIGO_ANTERIOR_REPETIDO } from "../lib/codigos";
import { obtenerDatabaseUrl } from "../lib/config/env";
import { datosPrisma as d } from "../lib/data/prisma";
import { obtenerPrisma } from "../lib/data/prisma/cliente";
import { ErrorDatos, MENSAJES, traducirError } from "../lib/data/errores";
import { diasDesdeHoy, hoyISO } from "../lib/fechas";
import type { Pieza, Usuario } from "../lib/tipos";
import { MENSAJE_ANIO_RANGO, MENSAJE_VALOR_ASEGURADO } from "../lib/validaciones";
import * as carga from "./datosCarga";

/*
 * Verificación de la capa de datos con Prisma contra la base cargada (npm run db:verificar).
 * Escribe datos temporales, siempre con el nombre "Verificación temporal", los borra al terminar y comprueba
 * que las 12 tablas quedaron idénticas. Excepción a la regla de process.env solo en lib/config/env.ts: este
 * script corre fuera de Next y la limpieza de errores necesita conocer los valores secretos para ocultarlos.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Sin .env.local las variables deben venir del entorno
}

const NOMBRE_TEMPORAL = "Verificación temporal";

/* Limpieza de errores: nunca se imprime una cadena, clave, correo ni servidor */

function fragmentosSecretos(): string[] {
  const fragmentos: string[] = [];
  for (const nombre of ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CARGA_ADMIN_EMAIL", "CARGA_COLABORADOR_EMAIL", "CARGA_CONTRASENA"]) {
    const valor = process.env[nombre];
    if (!valor) continue;
    fragmentos.push(valor);
    try {
      const url = new URL(valor);
      for (const parte of [url.username, url.password, url.hostname, url.host]) if (parte) fragmentos.push(parte);
    } catch {
      // No es una URL
    }
  }
  return fragmentos.filter((f) => f.length > 0);
}

function describirError(error: unknown): string {
  const e = (error ?? {}) as { name?: string; code?: unknown; message?: unknown };
  const tipo = `${e.name ?? "Error"}${e.code ? ` (${String(e.code)})` : ""}`;
  let detalle = (typeof e.message === "string" ? e.message : "").split("\n").find((l) => l.trim())?.trim() ?? "";
  const fragmentos = fragmentosSecretos();
  for (const f of fragmentos.sort((a, b) => b.length - a.length)) detalle = detalle.split(f).join("[oculto]");
  detalle = detalle
    .replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[oculto]")
    .replace(/[^\s@]+@[^\s@]+/g, "[oculto]")
    .replace(/\b[a-z0-9-]+(\.[a-z0-9-]+)+\b/gi, "[oculto]");
  const limpio = !fragmentos.some((f) => detalle.toLowerCase().includes(f.toLowerCase()));
  return `Tipo de error: ${tipo}.${limpio && detalle && detalle.length <= 160 ? ` Detalle: ${detalle}` : ""}`;
}

/* Pequeño ejecutor de pruebas */

class Falla extends Error {}
let aciertos = 0;
let fallos = 0;

async function prueba(nombre: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    aciertos++;
    console.log(`  OK     ${nombre}`);
  } catch (error) {
    fallos++;
    console.log(`  FALLO  ${nombre}: ${error instanceof Falla ? error.message : describirError(error)}`);
  }
}
/** Valor para mostrarlo en un fallo, sin cadenas de conexión, claves ni correos. */
function mostrar(valor: unknown): string {
  let texto: string;
  try {
    texto = JSON.stringify(valor) ?? String(valor);
  } catch {
    texto = String(valor);
  }
  for (const f of fragmentosSecretos().sort((a, b) => b.length - a.length)) texto = texto.split(f).join("[oculto]");
  texto = texto.replace(/[a-z][a-z0-9+.-]*:[/][/][^ ]+/gi, "[oculto]").replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g, "[oculto]");
  return texto.length > 200 ? `${texto.slice(0, 200)}...` : texto;
}
/** Si la condición falla, el mensaje dice qué se esperaba y qué se obtuvo cuando se pasan los dos valores. */
function esperar(condicion: boolean, detalle: string, esperado?: unknown, obtenido?: unknown): void {
  if (condicion) return;
  const valores = esperado === undefined && obtenido === undefined ? "" : `: se esperaba ${mostrar(esperado)} y se obtuvo ${mostrar(obtenido)}`;
  throw new Falla(`${detalle}${valores}`);
}
function esperarIgual<T>(obtenido: T, esperado: T, que: string): void {
  esperar(JSON.stringify(obtenido) === JSON.stringify(esperado), que, esperado, obtenido);
}
/** Entre operaciones simultáneas, una sola debe terminar bien y la otra fallar con este mensaje. */
function esperarUno(r: { bien: unknown[]; mensajes: string[] }, mensaje: string, que: string): void {
  esperar(r.bien.length === 1 && r.mensajes[0] === mensaje, que, { bien: 1, mensajes: [mensaje] }, { bien: r.bien.length, mensajes: r.mensajes });
}
/** La operación debe fallar con ErrorDatos y exactamente este mensaje. */
async function falla(mensaje: string, operacion: () => Promise<unknown>): Promise<void> {
  try {
    await operacion();
  } catch (error) {
    if (!(error instanceof ErrorDatos)) throw new Falla("falló con un error que no es de la capa de datos");
    esperar(error.message === mensaje, "mensaje de error", mensaje, error.message);
    return;
  }
  throw new Falla("debía fallar y terminó bien");
}
/** Resultados de operaciones simultáneas: cuántas terminaron bien y los mensajes de las que fallaron. */
function resumir<T>(resultados: PromiseSettledResult<T>[]): { bien: T[]; mensajes: string[] } {
  return {
    bien: resultados.flatMap((r) => (r.status === "fulfilled" ? [r.value] : [])),
    mensajes: resultados.flatMap((r) => (r.status === "rejected" ? [r.reason instanceof ErrorDatos ? r.reason.message : "error inesperado"] : [])),
  };
}

/* Instantánea de las 12 tablas para comprobar que la base queda idéntica */

async function instantanea(): Promise<{ conteos: { tabla: string; filas: number }[]; contenido: string }> {
  const p = obtenerPrisma();
  const ordenId = { orderBy: { id: "asc" as const } };
  const tablas = [
    ["organizacion", await p.organizacion.findMany(ordenId)],
    ["museo", await p.museo.findMany(ordenId)],
    ["usuario", await p.usuario.findMany(ordenId)],
    ["usuario_museo", await p.usuarioMuseo.findMany({ orderBy: [{ usuarioId: "asc" }, { museoId: "asc" }] })],
    ["categoria", await p.categoria.findMany(ordenId)],
    ["pieza", await p.pieza.findMany(ordenId)],
    ["historial_cambio", await p.historialCambio.findMany(ordenId)],
    ["exposicion", await p.exposicion.findMany(ordenId)],
    ["pieza_exposicion", await p.piezaExposicion.findMany({ orderBy: [{ piezaId: "asc" }, { exposicionId: "asc" }] })],
    ["prestamo", await p.prestamo.findMany(ordenId)],
    ["inventario", await p.inventario.findMany(ordenId)],
    ["detalle_inventario", await p.detalleInventario.findMany(ordenId)],
  ] as const;
  return {
    conteos: tablas.map(([tabla, filas]) => ({ tabla, filas: filas.length })),
    contenido: JSON.stringify(tablas.map(([, filas]) => filas)),
  };
}

/** Borra todo lo temporal, aunque una prueba haya fallado a la mitad. */
async function limpiarTemporales(): Promise<void> {
  const p = obtenerPrisma();
  const museos = (await p.museo.findMany({ where: { nombre: { startsWith: NOMBRE_TEMPORAL } }, select: { id: true } })).map((m) => m.id);
  const enMuseos = { in: museos };
  await p.historialCambio.deleteMany({ where: { pieza: { museoId: enMuseos } } });
  await p.detalleInventario.deleteMany({ where: { inventario: { museoId: enMuseos } } });
  await p.inventario.deleteMany({ where: { museoId: enMuseos } });
  await p.prestamo.deleteMany({ where: { pieza: { museoId: enMuseos } } });
  await p.piezaExposicion.deleteMany({ where: { exposicion: { museoId: enMuseos } } });
  await p.exposicion.deleteMany({ where: { museoId: enMuseos } });
  await p.pieza.deleteMany({ where: { museoId: enMuseos } });
  await p.usuarioMuseo.deleteMany({ where: { museoId: enMuseos } });
  await p.museo.deleteMany({ where: { id: enMuseos } });
  // Las organizaciones temporales se buscan por nombre, así se borran aunque una prueba haya fallado antes de devolver su id
  const organizaciones = (await p.organizacion.findMany({ where: { nombre: { startsWith: NOMBRE_TEMPORAL } }, select: { id: true } })).map((o) => o.id);
  await p.categoria.deleteMany({ where: { organizacionId: { in: organizaciones } } });
  await p.organizacion.deleteMany({ where: { id: { in: organizaciones } } });
}

/* Pruebas */

async function lecturas(org: string): Promise<{ usuarios: Usuario[] }> {
  console.log("\n1. Lecturas contra lo cargado");
  const [museos, usuarios, categorias, piezas, exposiciones, prestamos, inventarios] = await Promise.all([
    d.listarMuseos(org),
    d.listarUsuarios(org),
    d.listarCategorias(org),
    d.listarPiezas(org),
    d.listarExposiciones(org),
    d.listarPrestamos(org),
    d.listarInventarios(org),
  ]);
  await prueba("organización con su nombre", async () => {
    const o = await d.obtenerOrganizacion(org);
    esperar(o !== null && o.nombre === carga.NOMBRE_ORGANIZACION, "no coincide con el nombre cargado");
  });
  await prueba("cantidades: 4 museos, 6 usuarios, 8 categorías, 21 piezas, 6 exposiciones, 5 préstamos, 3 inventarios", async () => {
    esperarIgual(museos.length, 4, "cantidad de museos");
    esperarIgual(usuarios.length, 6, "cantidad de usuarios");
    esperarIgual(categorias.length, 8, "cantidad de categorías");
    esperarIgual(piezas.length, 21, "cantidad de piezas");
    esperarIgual(exposiciones.length, 6, "cantidad de exposiciones");
    esperarIgual(prestamos.length, 5, "cantidad de préstamos");
    esperarIgual(inventarios.length, 3, "cantidad de inventarios");
  });
  await prueba("11 asignaciones de museos, 15 detalles de inventario y 18 registros de historial", async () => {
    esperarIgual(usuarios.reduce((n, u) => n + u.museoIds.length, 0), 11, "asignaciones usuario_museo");
    const detalles = (await Promise.all(inventarios.map((i) => d.listarDetalleInventario(org, i.id)))).flat();
    esperarIgual(detalles.length, 15, "detalles de inventario");
    const historial = (await Promise.all(piezas.map((p) => d.listarHistorialPieza(org, p.id)))).flat();
    esperarIgual(historial.length, 18, "registros de historial");
  });
  await prueba("tipos convertidos: fechas de solo día en texto, marcas en ISO UTC y valor asegurado como número", async () => {
    esperar(/^\d{4}-\d{2}-\d{2}$/.test(prestamos[0].fechaSalida), "fecha de salida del préstamo", "AAAA-MM-DD", prestamos[0].fechaSalida);
    esperar(/^\d{4}-\d{2}-\d{2}$/.test(exposiciones[0].fechaInicio), "fecha de inicio de la exposición", "AAAA-MM-DD", exposiciones[0].fechaInicio);
    esperar(/^\d{4}-\d{2}-\d{2}T.*Z$/.test(piezas[0].fechaRegistro), "fecha de registro de la pieza", "ISO en UTC", piezas[0].fechaRegistro);
    esperar(typeof prestamos[0].valorAsegurado === "number", "valor asegurado");
    esperar(exposiciones.every((e) => e.piezaIds.length > 0), "piezaIds de las exposiciones");
    esperar(piezas.every((p) => p.imagenUrl === undefined), "imagen vacía sin null");
  });
  await prueba("correo en minúscula y búsqueda sin distinguir mayúsculas", async () => {
    const u = usuarios[0];
    esperar(u.email === u.email.toLowerCase(), "el correo no está en minúscula");
    const otra = await d.obtenerUsuarioPorEmail(u.email.toUpperCase());
    esperar(otra?.id === u.id, "no encontró el usuario con el correo en mayúscula");
    esperar((await d.obtenerUsuarioPorId(u.id))?.id === u.id, "obtenerUsuarioPorId");
  });

  console.log("\n   Lo que ve cada persona (museos asignados y su contenido):");
  const nombreDeMuseo = new Map(carga.MUSEOS.map((m) => [m.clave, m.nombre]));
  const claveDePieza = new Map(carga.PIEZAS.map((x) => [x.clave, x.museo]));
  const filas: Record<string, string | number>[] = [];
  await prueba("cada persona ve lo esperado según sus museos", async () => {
    const problemas: string[] = [];
    for (const u of usuarios) {
      const datosU = carga.USUARIOS.find((x) => x.nombre === u.nombre);
      if (!datosU) throw new Falla("hay un usuario que no está en los datos de la carga");
      const nombres = new Set(datosU.museos.map((m) => nombreDeMuseo.get(m)));
      const museoIds = new Set(museos.filter((m) => nombres.has(m.nombre)).map((m) => m.id));
      const visibles = u.rol === "administrador" ? new Set(museos.map((m) => m.id)) : new Set(u.museoIds);
      const piezasV = piezas.filter((p) => visibles.has(p.museoId));
      const exposV = exposiciones.filter((e) => visibles.has(e.museoId));
      const prestV = prestamos.filter((p) => visibles.has(piezas.find((x) => x.id === p.piezaId)?.museoId ?? ""));
      const inventV = inventarios.filter((i) => visibles.has(i.museoId));
      const claves = new Set(datosU.museos);
      const esperado = {
        piezas: carga.PIEZAS.filter((p) => claves.has(p.museo)).length,
        exposiciones: carga.EXPOSICIONES.filter((e) => claves.has(e.museo)).length,
        prestamos: carga.PRESTAMOS.filter((p) => claves.has(claveDePieza.get(p.pieza) ?? "")).length,
        inventarios: carga.INVENTARIOS.filter((i) => claves.has(i.museo)).length,
      };
      if (visibles.size !== museoIds.size) problemas.push(`${u.nombre}: museos asignados`);
      if (piezasV.length !== esperado.piezas) problemas.push(`${u.nombre}: piezas ${piezasV.length} y se esperaban ${esperado.piezas}`);
      if (exposV.length !== esperado.exposiciones) problemas.push(`${u.nombre}: exposiciones`);
      if (prestV.length !== esperado.prestamos) problemas.push(`${u.nombre}: préstamos`);
      if (inventV.length !== esperado.inventarios) problemas.push(`${u.nombre}: inventarios`);
      filas.push({ persona: u.nombre, activo: u.activo ? "sí" : "no", museos: visibles.size, piezas: piezasV.length, exposiciones: exposV.length, prestamos: prestV.length, inventarios: inventV.length });
    }
    esperar(problemas.length === 0, problemas.join("; "));
  });
  console.table(filas);
  return { usuarios };
}

async function aislamiento(org: string, usuarioReal: Usuario): Promise<void> {
  console.log("\n2. Aislamiento entre organizaciones (con una organización temporal)");
  const p = obtenerPrisma();
  const temporal = await p.organizacion.create({ data: { nombre: `${NOMBRE_TEMPORAL} de organización` } });
  const t = temporal.id;
  const categoriaTemporal = await p.categoria.create({ data: { organizacionId: t, nombre: "Categoría temporal" } });
  const museoTemporal = await d.crearMuseo(t, { nombre: `${NOMBRE_TEMPORAL} aislamiento`, tipo: "otro" });
  const piezaTemporal = await d.crearPieza(t, { museoId: museoTemporal.id, categoriaId: categoriaTemporal.id, nombre: "Pieza temporal", estadoConservacion: "bueno" });
  const museos = await d.listarMuseos(org);
  const piezas = await d.listarPiezas(org);
  const exposiciones = await d.listarExposiciones(org);
  const prestamos = await d.listarPrestamos(org);
  const inventarios = await d.listarInventarios(org);
  const foto = async () =>
    JSON.stringify([await d.listarMuseos(org), await d.listarPiezas(org), await d.listarExposiciones(org), await d.listarPrestamos(org), await d.listarInventarios(org), await d.listarUsuarios(org)]);
  const antes = await foto();

  await prueba("la organización temporal no ve nada de la real", async () => {
    esperar((await d.listarMuseos(t)).length === 1, "solo debe ver su museo");
    esperar((await d.listarPiezas(t)).length === 1, "solo debe ver su pieza");
    const vacias = [await d.listarExposiciones(t), await d.listarPrestamos(t), await d.listarInventarios(t), await d.listarUsuarios(t)];
    esperar(vacias.every((v) => v.length === 0), "alguna lista no está vacía");
    esperar((await d.obtenerMuseo(t, museos[0].id)) === null, "museo ajeno");
    esperar((await d.obtenerPieza(t, piezas[0].id)) === null, "pieza ajena");
    esperar((await d.obtenerExposicion(t, exposiciones[0].id)) === null, "exposición ajena");
    esperar((await d.obtenerPrestamo(t, prestamos[0].id)) === null, "préstamo ajeno");
    esperar((await d.obtenerInventario(t, inventarios[0].id)) === null, "inventario ajeno");
    esperar((await d.obtenerUsuario(t, usuarioReal.id)) === null, "usuario ajeno");
    esperar((await d.listarDetalleInventario(t, inventarios[0].id)).length === 0, "detalle ajeno");
    esperar((await d.listarHistorialPieza(t, piezas[0].id)).length === 0, "historial ajeno");
  });
  await prueba("la organización real no ve lo temporal", async () => {
    esperar(!museos.some((m) => m.id === museoTemporal.id), "museo temporal visible");
    esperar((await d.obtenerPieza(org, piezaTemporal.id)) === null, "pieza temporal visible");
    esperar((await d.listarCategorias(org)).every((c) => c.id !== categoriaTemporal.id), "categoría temporal visible");
  });
  await prueba("las escrituras con otra organización no cambian nada", async () => {
    await d.actualizarMuseo(t, museos[0].id, { nombre: "X" });
    await d.cambiarActivoMuseo(t, museos[0].id, false);
    await d.actualizarPieza(t, piezas[0].id, { nombre: "X" });
    await d.actualizarEstadoPieza(t, piezas[0].id, "malo");
    await d.actualizarDisponibilidadPieza(t, piezas[0].id, "en_prestamo");
    await d.cancelarExposicion(t, exposiciones[0].id);
    await d.actualizarExposicion(t, exposiciones[0].id, { nombre: "X" });
    await d.registrarDevolucion(t, prestamos[0].id, { fechaDevolucionReal: hoyISO(), estadoConservacionDevolucion: "malo" });
    await d.cerrarInventario(t, inventarios[2].id, new Date().toISOString(), usuarioReal.id);
    await d.actualizarUsuario(t, usuarioReal.id, { nombre: "X" });
    await d.cambiarActivoUsuario(t, usuarioReal.id, false);
    esperar((await foto()) === antes, "algo de la organización real cambió");
  });
  await prueba("las creaciones con referencias de otra organización fallan", async () => {
    const intentos: (() => Promise<unknown>)[] = [
      () => d.crearPieza(org, { museoId: museoTemporal.id, categoriaId: categoriaTemporal.id, nombre: "n", estadoConservacion: "bueno" }),
      () => d.crearPieza(t, { museoId: museoTemporal.id, categoriaId: (piezas[0].categoriaId), nombre: "n", estadoConservacion: "bueno" }),
      () => d.crearExposicion(t, { museoId: museoTemporal.id, nombre: "n", fechaInicio: diasDesdeHoy(100), fechaFin: diasDesdeHoy(110), piezaIds: [piezas[0].id] }),
      () => d.crearPrestamo(t, { piezaId: piezas[0].id, usuarioId: usuarioReal.id, institucionDestino: "i", responsableReceptor: "r", numeroConvenio: "c", numeroPoliza: "p", valorAsegurado: 10, fechaSalida: hoyISO(), fechaDevolucionPrevista: diasDesdeHoy(5), estadoConservacionSalida: "bueno" }),
      () => d.crearInventario(t, { museoId: museos[0].id, usuarioId: usuarioReal.id, fechaInicio: new Date().toISOString() }),
      () => d.registrarCambio(t, { piezaId: piezas[0].id, usuarioId: usuarioReal.id, campoModificado: "x" }),
      () => d.marcarResultadoInventario(t, inventarios[2].id, piezas[0].id, "encontrada"),
      () => d.crearUsuario(t, { id: randomUUID(), nombre: "n", email: "n@ejemplo.com", rol: "colaborador", activo: true, museoIds: [museos[0].id] }),
    ];
    for (const [i, intento] of intentos.entries()) {
      try {
        await intento();
      } catch (error) {
        if (error instanceof ErrorDatos) continue;
        throw new Falla(`el intento ${i + 1} falló con un error que no es de la capa de datos`);
      }
      throw new Falla(`el intento ${i + 1} debía fallar y terminó bien`);
    }
  });
}

async function traducciones(): Promise<void> {
  console.log("\n3. Traducción de errores de la base a mensajes en español");
  const casos: [string, string][] = [
    ["usuario_email_unico", MENSAJES.correoRegistrado],
    ["museo_organizacion_nombre_unico", MENSAJES.museoDuplicado],
    ["pieza_museo_codigo_anterior_unico", MENSAJE_CODIGO_ANTERIOR_REPETIDO],
    ["inventario_en_curso_unico", MENSAJES.inventarioEnCurso],
    ["prestamo_abierto_unico", MENSAJES.prestamoNoDisponible],
    ["pieza_anio_check", MENSAJE_ANIO_RANGO],
    ["prestamo_valor_asegurado_check", MENSAJE_VALOR_ASEGURADO],
    ["exposicion_check", MENSAJES.exposicionFechas],
    ["prestamo_check", MENSAJES.prestamoFechas],
  ];
  await prueba("cada restricción con nombre propio da su mensaje", async () => {
    for (const [nombre, mensaje] of casos) {
      esperar(traducirError(new Error(`violación de ${nombre}`)).message === mensaje, `la restricción ${nombre}`);
    }
  });
  await prueba("un error desconocido da un mensaje genérico sin texto técnico", async () => {
    const e = traducirError(new Error("detalle técnico secreto de la base"));
    esperar(e.message === MENSAJES.generico && !e.message.includes("secreto"), "mensaje genérico");
  });
}

async function escrituras(org: string, usuarios: Usuario[]): Promise<void> {
  console.log("\n4. Operaciones de escritura (en un museo temporal de la organización real)");
  const admin = usuarios.find((u) => u.rol === "administrador") as Usuario;
  const categoria = (await d.listarCategorias(org))[0].id;
  const museo = await d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} escrituras`, tipo: "otro", direccion: "Dirección temporal" });
  const nueva = (nombre: string, extra: Partial<Pieza> = {}) => ({ museoId: museo.id, categoriaId: categoria, nombre, estadoConservacion: "bueno" as const, ...extra });

  await prueba("museo: prefijo válido, nombre duplicado rechazado, actualizar y desactivar", async () => {
    esperar(/^[A-Z0-9]+$/.test(museo.prefijo), "prefijo fuera del patrón");
    await falla(MENSAJES.museoDuplicado, () => d.crearMuseo(org, { nombre: `  ${NOMBRE_TEMPORAL.toUpperCase()} ESCRITURAS `, tipo: "otro" }));
    await d.actualizarMuseo(org, museo.id, { nombre: `${NOMBRE_TEMPORAL} escrituras 2`, direccion: undefined });
    const m = await d.obtenerMuseo(org, museo.id);
    esperar(m?.nombre === `${NOMBRE_TEMPORAL} escrituras 2` && m.direccion === undefined, "actualizar o limpiar la dirección");
    await d.cambiarActivoMuseo(org, museo.id, false);
    esperar((await d.obtenerMuseo(org, museo.id))?.activo === false, "desactivar");
    await d.cambiarActivoMuseo(org, museo.id, true);
  });

  let p1!: Pieza;
  await prueba("piezas: códigos correlativos, código anterior normalizado y nada a medias", async () => {
    p1 = await d.crearPieza(org, nueva("Pieza 1", { codigoAnterior: "  ABC   123 " }));
    esperarIgual(p1.codigo, `${museo.prefijo}-001`, "primer código");
    await falla(MENSAJE_CODIGO_ANTERIOR_REPETIDO, () => d.crearPieza(org, nueva("Repetida", { codigoAnterior: "abc 123" })));
    const p2 = await d.crearPieza(org, nueva("Pieza 2"));
    esperarIgual(p2.codigo, `${museo.prefijo}-002`, "código tras un intento fallido (no debe quedar un hueco)");
    const encontrada = await d.buscarPiezaPorCodigoAnterior(org, museo.id, "Abc 123");
    esperarIgual(encontrada?.id, p1.id, "pieza encontrada por código anterior normalizado");
    const lote = await d.crearPiezas(org, [nueva("Lote 1"), nueva("Lote 2"), nueva("Lote 3")]);
    esperarIgual(lote.map((x) => x.codigo), [3, 4, 5].map((n) => `${museo.prefijo}-00${n}`), "códigos del lote en orden");
    esperar((await d.obtenerMuseo(org, museo.id)) !== null, "museo");
    esperarIgual((await obtenerPrisma().museo.findUnique({ where: { id: museo.id } }))?.ultimoCorrelativo, 5, "ultimo_correlativo del museo");
  });
  await prueba("piezas: actualizar, estado, disponibilidad y límites de la base", async () => {
    await d.actualizarPieza(org, p1.id, { nombre: "Pieza 1 editada", ubicacionFisica: "Sala", codigoAnterior: undefined });
    await d.actualizarEstadoPieza(org, p1.id, "regular");
    await d.actualizarDisponibilidadPieza(org, p1.id, "pendiente_verificacion");
    const leida = await d.obtenerPieza(org, p1.id);
    esperar(leida?.nombre === "Pieza 1 editada" && leida.ubicacionFisica === "Sala" && leida.codigoAnterior === undefined, "campos");
    esperar(leida?.estadoConservacion === "regular" && leida.disponibilidad === "pendiente_verificacion", "estado y disponibilidad");
    await d.actualizarDisponibilidadPieza(org, p1.id, "disponible");
    await falla(MENSAJE_ANIO_RANGO, () => d.crearPieza(org, nueva("Año fuera de rango", { anio: -20000 })));
  });

  const piezaPara = async (nombre: string) => d.crearPieza(org, nueva(nombre));
  await prueba("exposiciones: crear, cruces, modificar y cancelar", async () => {
    const a = await piezaPara("Para exposición A");
    const b = await piezaPara("Para exposición B");
    const e1 = await d.crearExposicion(org, { museoId: museo.id, nombre: "Exposición 1", fechaInicio: diasDesdeHoy(5), fechaFin: diasDesdeHoy(20), piezaIds: [a.id, b.id] });
    esperar(e1.piezaIds.length === 2, "piezas de la exposición");
    await falla(MENSAJES.exposicionConflicto, () => d.crearExposicion(org, { museoId: museo.id, nombre: "Cruzada", fechaInicio: diasDesdeHoy(10), fechaFin: diasDesdeHoy(30), piezaIds: [a.id] }));
    await d.crearExposicion(org, { museoId: museo.id, nombre: "Exposición 2", fechaInicio: diasDesdeHoy(40), fechaFin: diasDesdeHoy(50), piezaIds: [a.id] });
    await falla(MENSAJES.exposicionFechas, () => d.crearExposicion(org, { museoId: museo.id, nombre: "Fechas mal", fechaInicio: diasDesdeHoy(60), fechaFin: diasDesdeHoy(60), piezaIds: [b.id] }));
    await d.actualizarExposicion(org, e1.id, { nombre: "Exposición 1 editada", piezaIds: [b.id], descripcion: undefined });
    const leida = await d.obtenerExposicion(org, e1.id);
    esperar(leida?.nombre === "Exposición 1 editada" && leida.piezaIds.length === 1, "modificar");
    await d.cancelarExposicion(org, e1.id);
    await d.cancelarExposicion(org, e1.id);
    esperar((await d.obtenerExposicion(org, e1.id))?.cancelada === true, "cancelar");
    // Una exposición cancelada ya no cuenta para los cruces
    await d.crearExposicion(org, { museoId: museo.id, nombre: "Sobre la cancelada", fechaInicio: diasDesdeHoy(5), fechaFin: diasDesdeHoy(20), piezaIds: [b.id] });
  });

  await prueba("préstamos: disponibilidad, un solo préstamo abierto, devolución y límites", async () => {
    const pz = await piezaPara("Para préstamo");
    const base = { usuarioId: admin.id, institucionDestino: "Institución temporal", responsableReceptor: "Responsable temporal", numeroConvenio: "C-1", numeroPoliza: "P-1", valorAsegurado: 100, fechaSalida: hoyISO(), fechaDevolucionPrevista: diasDesdeHoy(10), estadoConservacionSalida: "bueno" as const };
    const pr = await d.crearPrestamo(org, { ...base, piezaId: pz.id });
    esperar(typeof pr.valorAsegurado === "number" && pr.fechaDevolucionReal === undefined, "préstamo creado");
    esperar((await d.obtenerPieza(org, pz.id))?.disponibilidad === "en_prestamo", "la pieza debe quedar en préstamo");
    await falla(MENSAJES.prestamoNoDisponible, () => d.crearPrestamo(org, { ...base, piezaId: pz.id }));
    await d.registrarDevolucion(org, pr.id, { fechaDevolucionReal: hoyISO(), estadoConservacionDevolucion: "regular" });
    await falla(MENSAJES.prestamoSinVigentes, () => d.registrarDevolucion(org, pr.id, { fechaDevolucionReal: hoyISO(), estadoConservacionDevolucion: "regular" }));
    const cerrado = await d.obtenerPrestamo(org, pr.id);
    esperar(cerrado?.fechaDevolucionReal === hoyISO() && cerrado.estadoConservacionDevolucion === "regular", "devolución guardada");
    await d.actualizarDisponibilidadPieza(org, pz.id, "disponible");
    await falla(MENSAJE_VALOR_ASEGURADO, () => d.crearPrestamo(org, { ...base, piezaId: pz.id, valorAsegurado: 0 }));
    await falla(MENSAJES.prestamoFechas, () => d.crearPrestamo(org, { ...base, piezaId: pz.id, fechaDevolucionPrevista: hoyISO() }));
    // Una pieza en una exposición cruzada no se presta
    const ex = await piezaPara("En exposición");
    await d.crearExposicion(org, { museoId: museo.id, nombre: "Exposición del préstamo", fechaInicio: diasDesdeHoy(1), fechaFin: diasDesdeHoy(20), piezaIds: [ex.id] });
    await falla(MENSAJES.prestamoNoDisponible, () => d.crearPrestamo(org, { ...base, piezaId: ex.id }));
  });

  await prueba("inventarios: uno en curso por museo, marcas, cierre con sus efectos y registros", async () => {
    const [x, y, z] = [await piezaPara("Inventario encontrada"), await piezaPara("Inventario no encontrada"), await piezaPara("Inventario con daño")];
    const inv = await d.crearInventario(org, { museoId: museo.id, usuarioId: admin.id, fechaInicio: new Date().toISOString() });
    await falla(MENSAJES.inventarioEnCurso, () => d.crearInventario(org, { museoId: museo.id, usuarioId: admin.id, fechaInicio: new Date().toISOString() }));
    await d.marcarResultadoInventario(org, inv.id, x.id, "no_encontrada");
    await d.marcarResultadoInventario(org, inv.id, x.id, "encontrada", "corregida");
    await d.marcarResultadoInventario(org, inv.id, y.id, "no_encontrada", "No se ubicó");
    await d.marcarResultadoInventario(org, inv.id, z.id, "con_dano", "Fisura");
    esperar((await d.listarDetalleInventario(org, inv.id)).length === 3, "tres detalles, sin duplicar la pieza corregida");
    await d.cerrarInventario(org, inv.id, new Date().toISOString(), admin.id);
    const cerrado = await d.obtenerInventario(org, inv.id);
    esperar(cerrado?.estado === "cerrado" && cerrado.usuarioCierreId === admin.id && cerrado.fechaCierre !== undefined, "cierre");
    esperar((await d.obtenerPieza(org, y.id))?.disponibilidad === "pendiente_verificacion", "la no encontrada pasa a pendiente de verificación");
    esperar((await d.obtenerPieza(org, z.id))?.estadoConservacion === "malo", "la pieza con daño pasa a estado malo");
    const hy = await d.listarHistorialPieza(org, y.id);
    esperar(hy.length === 1 && hy[0].valorAnterior === "disponible" && hy[0].valorNuevo === "pendiente_verificacion", "historial de la no encontrada");
    await falla(MENSAJES.inventarioCerrado, () => d.cerrarInventario(org, inv.id, new Date().toISOString(), admin.id));
    await falla(MENSAJES.inventarioCerrado, () => d.marcarResultadoInventario(org, inv.id, x.id, "encontrada"));
  });

  await prueba("historial: registrar y listar", async () => {
    const c = await d.registrarCambio(org, { piezaId: p1.id, usuarioId: admin.id, campoModificado: "nombre", valorAnterior: "a", valorNuevo: "b" });
    esperar(/^\d{4}-\d{2}-\d{2}T.*Z$/.test(c.fecha), "fecha en ISO");
    esperar((await d.listarHistorialPieza(org, p1.id)).some((h) => h.id === c.id), "no aparece en el historial");
  });

  await prueba("usuarios: reemplazar museos, activar y desactivar y exigir la cuenta de Auth", async () => {
    const objetivo = usuarios.find((u) => !u.activo) ?? usuarios[usuarios.length - 1];
    const museos = await d.listarMuseos(org);
    const otros = museos.filter((m) => !m.nombre.startsWith(NOMBRE_TEMPORAL));
    try {
      await d.actualizarUsuario(org, objetivo.id, { museoIds: [otros[0].id] });
      esperar((await d.obtenerUsuario(org, objetivo.id))?.museoIds.join() === otros[0].id, "museos reemplazados");
      await d.cambiarActivoUsuario(org, objetivo.id, !objetivo.activo);
      esperar((await d.obtenerUsuario(org, objetivo.id))?.activo === !objetivo.activo, "cambio de estado");
    } finally {
      await d.actualizarUsuario(org, objetivo.id, { museoIds: objetivo.museoIds });
      await d.cambiarActivoUsuario(org, objetivo.id, objetivo.activo);
    }
    let rechazado = false;
    try {
      await d.crearUsuario(org, { id: randomUUID(), nombre: "n", email: "sin.cuenta@ejemplo.com", rol: "colaborador", activo: true, museoIds: [] });
    } catch (error) {
      rechazado = error instanceof ErrorDatos;
    }
    esperar(rechazado, "un usuario sin cuenta de Auth debe rechazarse");
  });
}

async function concurrencia(org: string, usuarios: Usuario[]): Promise<void> {
  console.log("\n5. Operaciones simultáneas");
  const admin = usuarios.find((u) => u.rol === "administrador") as Usuario;
  const categoria = (await d.listarCategorias(org))[0].id;
  const museo = await d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} concurrencia`, tipo: "otro" });
  const nueva = (nombre: string) => ({ museoId: museo.id, categoriaId: categoria, nombre, estadoConservacion: "bueno" as const });
  const base = { usuarioId: admin.id, institucionDestino: "Institución temporal", responsableReceptor: "Responsable temporal", numeroConvenio: "C-1", numeroPoliza: "P-1", valorAsegurado: 100, fechaSalida: hoyISO(), fechaDevolucionPrevista: diasDesdeHoy(10), estadoConservacionSalida: "bueno" as const };

  await prueba("dos creaciones de pieza a la vez dan códigos distintos", async () => {
    const r = resumir(await Promise.allSettled([d.crearPieza(org, nueva("A")), d.crearPieza(org, nueva("B")), d.crearPieza(org, nueva("C"))]));
    esperarIgual(r.bien.length, 3, "creaciones que terminaron bien");
    esperar(new Set(r.bien.map((p) => p.codigo)).size === 3, "hay códigos repetidos");
    const lotes = resumir(await Promise.allSettled([d.crearPiezas(org, [nueva("L1"), nueva("L2")]), d.crearPiezas(org, [nueva("L3"), nueva("L4")])]));
    const codigos = lotes.bien.flat().map((p) => p.codigo);
    esperar(lotes.bien.length === 2 && new Set(codigos).size === 4, "dos lotes simultáneos repiten códigos");
  });
  await prueba("dos museos simultáneos con el mismo prefijo reciben prefijos distintos", async () => {
    const r = resumir(await Promise.allSettled([d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} Alfa`, tipo: "otro" }), d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} Alto`, tipo: "otro" })]));
    esperar(r.bien.length === 2 && r.bien[0].prefijo !== r.bien[1].prefijo, "prefijos repetidos o un museo no se creó");
  });
  await prueba("dos museos simultáneos con el mismo nombre: solo uno", async () => {
    const r = resumir(await Promise.allSettled([d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} Gamma`, tipo: "otro" }), d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} gamma `, tipo: "otro" })]));
    esperarUno(r, MENSAJES.museoDuplicado, "debía crearse uno solo y el otro dar el mensaje de nombre duplicado");
  });
  await prueba("dos préstamos simultáneos de la misma pieza dan uno solo", async () => {
    const pz = await d.crearPieza(org, nueva("Pieza en disputa"));
    const r = resumir(await Promise.allSettled([d.crearPrestamo(org, { ...base, piezaId: pz.id }), d.crearPrestamo(org, { ...base, piezaId: pz.id })]));
    esperarUno(r, MENSAJES.prestamoNoDisponible, "debía crearse uno solo y el otro dar el mensaje de no disponible");
    const abiertos = (await d.listarPrestamos(org)).filter((p) => p.piezaId === pz.id && !p.fechaDevolucionReal);
    esperarIgual(abiertos.length, 1, "préstamos abiertos de la pieza");
    // Doble devolución
    const dev = resumir(await Promise.allSettled([d.registrarDevolucion(org, r.bien[0].id, { fechaDevolucionReal: hoyISO(), estadoConservacionDevolucion: "bueno" }), d.registrarDevolucion(org, r.bien[0].id, { fechaDevolucionReal: hoyISO(), estadoConservacionDevolucion: "bueno" })]));
    esperarUno(dev, MENSAJES.prestamoSinVigentes, "la doble devolución debía cerrarse una sola vez");
  });
  await prueba("dos exposiciones simultáneas con la misma pieza y fechas cruzadas: solo una", async () => {
    const pz = await d.crearPieza(org, nueva("Pieza para exposiciones"));
    const crear = (nombre: string) => d.crearExposicion(org, { museoId: museo.id, nombre, fechaInicio: diasDesdeHoy(5), fechaFin: diasDesdeHoy(15), piezaIds: [pz.id] });
    const r = resumir(await Promise.allSettled([crear("Simultánea 1"), crear("Simultánea 2")]));
    esperarUno(r, MENSAJES.exposicionConflicto, "debía crearse una sola");
  });
  await prueba("dos inventarios simultáneos en el mismo museo: solo uno en curso", async () => {
    const museoInv = await d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} inventarios`, tipo: "otro" });
    const crear = () => d.crearInventario(org, { museoId: museoInv.id, usuarioId: admin.id, fechaInicio: new Date().toISOString() });
    const r = resumir(await Promise.allSettled([crear(), crear()]));
    esperarUno(r, MENSAJES.inventarioEnCurso, "debía crearse uno solo");
  });
  await prueba("doble cierre del mismo inventario: se cierra una vez y sin historial duplicado", async () => {
    const museoCierre = await d.crearMuseo(org, { nombre: `${NOMBRE_TEMPORAL} cierre`, tipo: "otro" });
    const faltante = await d.crearPieza(org, { museoId: museoCierre.id, categoriaId: categoria, nombre: "Faltante", estadoConservacion: "bueno" });
    const inv = await d.crearInventario(org, { museoId: museoCierre.id, usuarioId: admin.id, fechaInicio: new Date().toISOString() });
    await d.marcarResultadoInventario(org, inv.id, faltante.id, "no_encontrada");
    const cerrar = () => d.cerrarInventario(org, inv.id, new Date().toISOString(), admin.id);
    const r = resumir(await Promise.allSettled([cerrar(), cerrar()]));
    esperarUno(r, MENSAJES.inventarioCerrado, "debía cerrarse una sola vez");
    const h = (await d.listarHistorialPieza(org, faltante.id)).filter((x) => x.campoModificado === "disponibilidad");
    esperarIgual(h.length, 1, "registros de disponibilidad de la pieza no encontrada");
  });
}

async function principal(): Promise<void> {
  try {
    obtenerDatabaseUrl();
  } catch {
    console.log("Falta DATABASE_URL en .env.local. Complétela siguiendo .env.example y vuelva a ejecutar npm run db:verificar.");
    process.exitCode = 1;
    return;
  }
  const prisma = obtenerPrisma();
  try {
    const org = await prisma.organizacion.findFirst({ where: { nombre: carga.NOMBRE_ORGANIZACION } });
    if (!org) {
      console.log("La base no tiene la organización cargada. Ejecute npm run db:cargar antes de verificar.");
      process.exitCode = 1;
      return;
    }
    console.log("Verificación de la capa de datos con Prisma (solo escribe datos temporales y los borra al terminar)");
    const antes = await instantanea();
    try {
      const { usuarios } = await lecturas(org.id);
      await aislamiento(org.id, usuarios[0]);
      await traducciones();
      await escrituras(org.id, usuarios);
      await concurrencia(org.id, usuarios);
    } catch (error) {
      fallos++;
      console.log(`\nLa verificación se detuvo. ${describirError(error)}`);
    } finally {
      try {
        await limpiarTemporales();
      } catch (error) {
        fallos++;
        console.log(`\nNo se pudieron borrar todos los datos temporales. ${describirError(error)}`);
      }
    }
    const despues = await instantanea();
    console.log("\nFilas por tabla, antes y después:");
    console.table(antes.conteos.map((c, i) => ({ tabla: c.tabla, antes: c.filas, despues: despues.conteos[i].filas })));
    const identica = antes.contenido === despues.contenido;
    console.log(identica ? "La base quedó idéntica a como estaba (mismas filas y mismo contenido)." : "ATENCIÓN: la base no quedó idéntica. Revise los datos temporales.");
    if (!identica) fallos++;
    console.log(`\nResumen: ${aciertos} pruebas correctas y ${fallos} con fallos.`);
    if (fallos > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

principal().catch((error) => {
  console.log(`El script se detuvo. ${describirError(error)}`);
  process.exitCode = 1;
});
