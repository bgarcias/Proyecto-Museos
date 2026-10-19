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

/** Código siguiente de un museo: su prefijo y el mayor correlativo existente más uno. */
function codigoSiguiente(museoId: string): string {
  const a = almacen();
  const prefijo = a.museos.find((m) => m.id === museoId)?.prefijo ?? "";
  const codigos = a.piezas.filter((p) => p.museoId === museoId).map((p) => p.codigo);
  return formatearCodigo(prefijo, siguienteNumeroCodigo(prefijo, codigos));
}

export const datosMemoria: Datos = {
  async obtenerOrganizacion(id) {
    return copia(almacen().organizaciones.find((o) => o.id === id) ?? null);
  },

  async listarMuseos(organizacionId) {
    return copia(almacen().museos.filter((m) => m.organizacionId === organizacionId));
  },
  async obtenerMuseo(id) {
    return copia(almacen().museos.find((m) => m.id === id) ?? null);
  },
  async crearMuseo(organizacionId, datos) {
    const existentes = almacen().museos.filter((m) => m.organizacionId === organizacionId).map((m) => m.prefijo);
    const museo = { ...datos, id: randomUUID(), organizacionId, prefijo: calcularPrefijoMuseo(datos.nombre, existentes), activo: true };
    almacen().museos.push(museo);
    return copia(museo);
  },
  async actualizarMuseo(id, cambios) {
    const m = almacen().museos.find((x) => x.id === id);
    if (m) Object.assign(m, cambios);
  },
  async cambiarActivoMuseo(id, activo) {
    const m = almacen().museos.find((x) => x.id === id);
    if (m) m.activo = activo;
  },

  async listarUsuarios(organizacionId) {
    return copia(almacen().usuarios.filter((u) => u.organizacionId === organizacionId));
  },
  async obtenerUsuario(id) {
    return copia(almacen().usuarios.find((u) => u.id === id) ?? null);
  },
  async obtenerUsuarioPorEmail(email) {
    const buscado = email.trim().toLowerCase();
    return copia(almacen().usuarios.find((u) => u.email.toLowerCase() === buscado) ?? null);
  },
  async crearUsuario(datos) {
    const usuario = { ...datos, id: randomUUID() };
    almacen().usuarios.push(usuario);
    return copia(usuario);
  },
  async actualizarUsuario(id, cambios) {
    const u = almacen().usuarios.find((x) => x.id === id);
    if (!u) return;
    Object.assign(u, cambios);
    if (cambios.museoIds) u.museoIds = [...cambios.museoIds];
  },
  async cambiarActivoUsuario(id, activo) {
    const u = almacen().usuarios.find((x) => x.id === id);
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

  async listarPiezas() {
    return copia(almacen().piezas);
  },
  async obtenerPieza(id) {
    return copia(almacen().piezas.find((p) => p.id === id) ?? null);
  },
  async buscarPiezaPorCodigoAnterior(museoId, codigoAnterior) {
    const buscado = claveCodigoAnterior(codigoAnterior);
    return copia(
      almacen().piezas.find(
        (p) => p.museoId === museoId && p.codigoAnterior !== undefined && claveCodigoAnterior(p.codigoAnterior) === buscado,
      ) ?? null,
    );
  },
  async crearPieza(datos) {
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
  async crearPiezas(lote) {
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
  async actualizarPieza(id, cambios) {
    const p = almacen().piezas.find((x) => x.id === id);
    if (p) Object.assign(p, cambios);
  },
  async actualizarEstadoPieza(id, estado) {
    const p = almacen().piezas.find((x) => x.id === id);
    if (p) p.estadoConservacion = estado;
  },
  async actualizarDisponibilidadPieza(id, disponibilidad) {
    const p = almacen().piezas.find((x) => x.id === id);
    if (p) p.disponibilidad = disponibilidad;
  },

  async listarExposiciones() {
    return copia(almacen().exposiciones);
  },
  async obtenerExposicion(id) {
    return copia(almacen().exposiciones.find((e) => e.id === id) ?? null);
  },
  async crearExposicion(datos) {
    const exposicion = { ...datos, id: randomUUID(), cancelada: false, piezaIds: [...datos.piezaIds] };
    almacen().exposiciones.push(exposicion);
    return copia(exposicion);
  },
  async actualizarExposicion(id, cambios) {
    const e = almacen().exposiciones.find((x) => x.id === id);
    if (!e) return;
    Object.assign(e, cambios);
    if (cambios.piezaIds) e.piezaIds = [...cambios.piezaIds];
  },
  async cancelarExposicion(id) {
    const e = almacen().exposiciones.find((x) => x.id === id);
    if (e) e.cancelada = true;
  },

  async listarPrestamos() {
    return copia(almacen().prestamos);
  },
  async obtenerPrestamo(id) {
    return copia(almacen().prestamos.find((p) => p.id === id) ?? null);
  },
  async crearPrestamo(datos) {
    const prestamo = { ...datos, id: randomUUID() };
    almacen().prestamos.push(prestamo);
    return copia(prestamo);
  },
  async registrarDevolucion(id, datos) {
    const p = almacen().prestamos.find((x) => x.id === id);
    if (p) Object.assign(p, datos);
  },

  async listarInventarios() {
    return copia(almacen().inventarios);
  },
  async obtenerInventario(id) {
    return copia(almacen().inventarios.find((i) => i.id === id) ?? null);
  },
  async crearInventario(datos) {
    const inventario = { ...datos, id: randomUUID(), estado: "en_curso" as const };
    almacen().inventarios.push(inventario);
    return copia(inventario);
  },
  async marcarResultadoInventario(inventarioId, piezaId, resultado, observacion) {
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
  async listarDetalleInventario(inventarioId) {
    return copia(almacen().detallesInventario.filter((d) => d.inventarioId === inventarioId));
  },
  async cerrarInventario(id, fechaCierre, usuarioCierreId) {
    const i = almacen().inventarios.find((x) => x.id === id);
    if (i) {
      i.estado = "cerrado";
      i.fechaCierre = fechaCierre;
      i.usuarioCierreId = usuarioCierreId;
    }
  },

  async listarHistorialPieza(piezaId) {
    return copia(almacen().historial.filter((h) => h.piezaId === piezaId));
  },
  async registrarCambio(datos) {
    const cambio = { ...datos, id: randomUUID(), fecha: new Date().toISOString() };
    almacen().historial.push(cambio);
    return copia(cambio);
  },

  async restablecerDatos() {
    globalConAlmacen.__museosDemo = crearDatosIniciales();
  },
};
