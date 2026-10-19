import { randomUUID } from "node:crypto";
import type { Datos } from "../contratos";
import { calcularPrefijoMuseo, claveCodigoAnterior, formatearCodigo, siguienteNumeroCodigo } from "../../codigos";
import { crearDatosIniciales, type Almacen } from "./semilla";

/** Los datos viven en globalThis para que no se reinicien con la recarga en caliente. */
const globalConAlmacen = globalThis as unknown as { __museosDemo?: Almacen };

function almacen(): Almacen {
  if (!globalConAlmacen.__museosDemo) {
    globalConAlmacen.__museosDemo = crearDatosIniciales();
  }
  return globalConAlmacen.__museosDemo;
}

/** Devuelve copias para que nadie modifique el almacén fuera de esta capa. */
function copia<T>(valor: T): T {
  return structuredClone(valor);
}

/* Aislamiento por organización: cada búsqueda por id solo encuentra lo que es de la organización pedida */

const idsMuseosDe = (organizacionId: string) =>
  new Set(almacen().museos.filter((m) => m.organizacionId === organizacionId).map((m) => m.id));
const museoDe = (organizacionId: string, id: string) =>
  almacen().museos.find((m) => m.id === id && m.organizacionId === organizacionId);
const usuarioDe = (organizacionId: string, id: string) =>
  almacen().usuarios.find((u) => u.id === id && u.organizacionId === organizacionId);
const piezaDe = (organizacionId: string, id: string) => {
  const p = almacen().piezas.find((x) => x.id === id);
  return p && idsMuseosDe(organizacionId).has(p.museoId) ? p : undefined;
};
const exposicionDe = (organizacionId: string, id: string) => {
  const e = almacen().exposiciones.find((x) => x.id === id);
  return e && idsMuseosDe(organizacionId).has(e.museoId) ? e : undefined;
};
const prestamoDe = (organizacionId: string, id: string) => {
  const p = almacen().prestamos.find((x) => x.id === id);
  return p && piezaDe(organizacionId, p.piezaId) ? p : undefined;
};
const inventarioDe = (organizacionId: string, id: string) => {
  const i = almacen().inventarios.find((x) => x.id === id);
  return i && idsMuseosDe(organizacionId).has(i.museoId) ? i : undefined;
};

/** Las creaciones lanzan este error si lo que referencian es de otra organización. */
function fuera(entidad: string): never {
  throw new Error(`${entidad} no pertenece a la organización`);
}
const exigirMuseo = (organizacionId: string, id: string) => (museoDe(organizacionId, id) ? undefined : fuera("El museo"));
const exigirPieza = (organizacionId: string, id: string) => (piezaDe(organizacionId, id) ? undefined : fuera("La pieza"));
const exigirUsuario = (organizacionId: string, id: string) => (usuarioDe(organizacionId, id) ? undefined : fuera("El usuario"));
const exigirCategoria = (organizacionId: string, id: string) => {
  if (!almacen().categorias.some((c) => c.id === id && c.organizacionId === organizacionId)) fuera("La categoría");
};

/** Código siguiente de un museo: su prefijo y el mayor correlativo existente más uno. */
function codigoSiguiente(museoId: string): string {
  const a = almacen();
  const prefijo = a.museos.find((m) => m.id === museoId)?.prefijo ?? "";
  const codigos = a.piezas.filter((p) => p.museoId === museoId).map((p) => p.codigo);
  return formatearCodigo(prefijo, siguienteNumeroCodigo(prefijo, codigos));
}

export const datosMemoria: Datos = {
  async obtenerOrganizacion(organizacionId) {
    return copia(almacen().organizaciones.find((o) => o.id === organizacionId) ?? null);
  },

  async listarMuseos(organizacionId) {
    return copia(almacen().museos.filter((m) => m.organizacionId === organizacionId));
  },
  async obtenerMuseo(organizacionId, id) {
    return copia(museoDe(organizacionId, id) ?? null);
  },
  async crearMuseo(organizacionId, datos) {
    const existentes = almacen().museos.filter((m) => m.organizacionId === organizacionId).map((m) => m.prefijo);
    const museo = { ...datos, id: randomUUID(), organizacionId, prefijo: calcularPrefijoMuseo(datos.nombre, existentes), activo: true };
    almacen().museos.push(museo);
    return copia(museo);
  },
  async actualizarMuseo(organizacionId, id, cambios) {
    const m = museoDe(organizacionId, id);
    if (m) Object.assign(m, cambios);
  },
  async cambiarActivoMuseo(organizacionId, id, activo) {
    const m = museoDe(organizacionId, id);
    if (m) m.activo = activo;
  },

  async listarUsuarios(organizacionId) {
    return copia(almacen().usuarios.filter((u) => u.organizacionId === organizacionId));
  },
  async obtenerUsuario(organizacionId, id) {
    return copia(usuarioDe(organizacionId, id) ?? null);
  },
  async obtenerUsuarioPorId(id) {
    return copia(almacen().usuarios.find((u) => u.id === id) ?? null);
  },
  async obtenerUsuarioPorEmail(email) {
    const buscado = email.trim().toLowerCase();
    return copia(almacen().usuarios.find((u) => u.email.toLowerCase() === buscado) ?? null);
  },
  async crearUsuario(organizacionId, datos) {
    for (const museoId of datos.museoIds) exigirMuseo(organizacionId, museoId);
    const usuario = { ...datos, id: datos.id ?? randomUUID(), organizacionId, museoIds: [...datos.museoIds] };
    almacen().usuarios.push(usuario);
    return copia(usuario);
  },
  async actualizarUsuario(organizacionId, id, cambios) {
    const u = usuarioDe(organizacionId, id);
    if (!u) return;
    if (cambios.museoIds) for (const museoId of cambios.museoIds) exigirMuseo(organizacionId, museoId);
    Object.assign(u, cambios);
    if (cambios.museoIds) u.museoIds = [...cambios.museoIds];
  },
  async cambiarActivoUsuario(organizacionId, id, activo) {
    const u = usuarioDe(organizacionId, id);
    if (u) u.activo = activo;
  },
  async actualizarContrasena(id, contrasena) {
    const u = almacen().usuarios.find((x) => x.id === id);
    if (u) {
      u.contrasena = contrasena;
      u.debeCambiarContrasena = false;
    }
  },

  async listarCategorias(organizacionId) {
    return copia(almacen().categorias.filter((c) => c.organizacionId === organizacionId));
  },

  async listarPiezas(organizacionId) {
    const museos = idsMuseosDe(organizacionId);
    return copia(almacen().piezas.filter((p) => museos.has(p.museoId)));
  },
  async obtenerPieza(organizacionId, id) {
    return copia(piezaDe(organizacionId, id) ?? null);
  },
  async buscarPiezaPorCodigoAnterior(organizacionId, museoId, codigoAnterior) {
    if (!museoDe(organizacionId, museoId)) return null;
    const buscado = claveCodigoAnterior(codigoAnterior);
    return copia(
      almacen().piezas.find(
        (p) => p.museoId === museoId && p.codigoAnterior !== undefined && claveCodigoAnterior(p.codigoAnterior) === buscado,
      ) ?? null,
    );
  },
  async crearPieza(organizacionId, datos) {
    exigirMuseo(organizacionId, datos.museoId);
    exigirCategoria(organizacionId, datos.categoriaId);
    const pieza = {
      ...datos,
      codigo: codigoSiguiente(datos.museoId),
      id: randomUUID(),
      disponibilidad: "disponible" as const,
      fechaRegistro: new Date().toISOString(),
    };
    almacen().piezas.push(pieza);
    return copia(pieza);
  },
  async crearPiezas(organizacionId, lote) {
    for (const datos of lote) {
      exigirMuseo(organizacionId, datos.museoId);
      exigirCategoria(organizacionId, datos.categoriaId);
    }
    const ahora = new Date().toISOString();
    // Los códigos se asignan uno a uno, en el orden recibido, dentro de la misma operación.
    const nuevas = [];
    for (const datos of lote) {
      const pieza = {
        ...datos,
        codigo: codigoSiguiente(datos.museoId),
        id: randomUUID(),
        disponibilidad: "disponible" as const,
        fechaRegistro: ahora,
      };
      almacen().piezas.push(pieza);
      nuevas.push(pieza);
    }
    return copia(nuevas);
  },
  async actualizarPieza(organizacionId, id, cambios) {
    const p = piezaDe(organizacionId, id);
    if (!p) return;
    if (cambios.categoriaId) exigirCategoria(organizacionId, cambios.categoriaId);
    Object.assign(p, cambios);
  },
  async actualizarEstadoPieza(organizacionId, id, estado) {
    const p = piezaDe(organizacionId, id);
    if (p) p.estadoConservacion = estado;
  },
  async actualizarDisponibilidadPieza(organizacionId, id, disponibilidad) {
    const p = piezaDe(organizacionId, id);
    if (p) p.disponibilidad = disponibilidad;
  },

  async listarExposiciones(organizacionId) {
    const museos = idsMuseosDe(organizacionId);
    return copia(almacen().exposiciones.filter((e) => museos.has(e.museoId)));
  },
  async obtenerExposicion(organizacionId, id) {
    return copia(exposicionDe(organizacionId, id) ?? null);
  },
  async crearExposicion(organizacionId, datos) {
    exigirMuseo(organizacionId, datos.museoId);
    for (const piezaId of datos.piezaIds) exigirPieza(organizacionId, piezaId);
    const exposicion = { ...datos, id: randomUUID(), cancelada: false, piezaIds: [...datos.piezaIds] };
    almacen().exposiciones.push(exposicion);
    return copia(exposicion);
  },
  async actualizarExposicion(organizacionId, id, cambios) {
    const e = exposicionDe(organizacionId, id);
    if (!e) return;
    if (cambios.museoId) exigirMuseo(organizacionId, cambios.museoId);
    if (cambios.piezaIds) for (const piezaId of cambios.piezaIds) exigirPieza(organizacionId, piezaId);
    Object.assign(e, cambios);
    if (cambios.piezaIds) e.piezaIds = [...cambios.piezaIds];
  },
  async cancelarExposicion(organizacionId, id) {
    const e = exposicionDe(organizacionId, id);
    if (e) e.cancelada = true;
  },

  async listarPrestamos(organizacionId) {
    return copia(almacen().prestamos.filter((p) => piezaDe(organizacionId, p.piezaId)));
  },
  async obtenerPrestamo(organizacionId, id) {
    return copia(prestamoDe(organizacionId, id) ?? null);
  },
  async crearPrestamo(organizacionId, datos) {
    exigirPieza(organizacionId, datos.piezaId);
    exigirUsuario(organizacionId, datos.usuarioId);
    const prestamo = { ...datos, id: randomUUID() };
    almacen().prestamos.push(prestamo);
    return copia(prestamo);
  },
  async registrarDevolucion(organizacionId, id, datos) {
    const p = prestamoDe(organizacionId, id);
    if (p) Object.assign(p, datos);
  },

  async listarInventarios(organizacionId) {
    const museos = idsMuseosDe(organizacionId);
    return copia(almacen().inventarios.filter((i) => museos.has(i.museoId)));
  },
  async obtenerInventario(organizacionId, id) {
    return copia(inventarioDe(organizacionId, id) ?? null);
  },
  async crearInventario(organizacionId, datos) {
    exigirMuseo(organizacionId, datos.museoId);
    exigirUsuario(organizacionId, datos.usuarioId);
    const inventario = { ...datos, id: randomUUID(), estado: "en_curso" as const };
    almacen().inventarios.push(inventario);
    return copia(inventario);
  },
  async marcarResultadoInventario(organizacionId, inventarioId, piezaId, resultado, observacion) {
    if (!inventarioDe(organizacionId, inventarioId)) fuera("El inventario");
    exigirPieza(organizacionId, piezaId);
    const a = almacen();
    let detalle = a.detallesInventario.find((d) => d.inventarioId === inventarioId && d.piezaId === piezaId);
    if (detalle) {
      detalle.resultado = resultado;
      detalle.observacion = observacion;
    } else {
      detalle = { id: randomUUID(), inventarioId, piezaId, resultado, observacion };
      a.detallesInventario.push(detalle);
    }
    return copia(detalle);
  },
  async listarDetalleInventario(organizacionId, inventarioId) {
    if (!inventarioDe(organizacionId, inventarioId)) return [];
    return copia(almacen().detallesInventario.filter((d) => d.inventarioId === inventarioId));
  },
  async cerrarInventario(organizacionId, id, fechaCierre, usuarioCierreId) {
    const i = inventarioDe(organizacionId, id);
    if (!i) return;
    exigirUsuario(organizacionId, usuarioCierreId);
    i.estado = "cerrado";
    i.fechaCierre = fechaCierre;
    i.usuarioCierreId = usuarioCierreId;
  },

  async listarHistorialPieza(organizacionId, piezaId) {
    if (!piezaDe(organizacionId, piezaId)) return [];
    return copia(almacen().historial.filter((h) => h.piezaId === piezaId));
  },
  async registrarCambio(organizacionId, datos) {
    exigirPieza(organizacionId, datos.piezaId);
    exigirUsuario(organizacionId, datos.usuarioId);
    const cambio = { ...datos, id: randomUUID(), fecha: new Date().toISOString() };
    almacen().historial.push(cambio);
    return copia(cambio);
  },

  async restablecerDatos() {
    globalConAlmacen.__museosDemo = crearDatosIniciales();
  },
};
