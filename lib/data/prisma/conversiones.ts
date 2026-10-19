import type {
  Categoria as CategoriaDb,
  DetalleInventario as DetalleDb,
  Exposicion as ExposicionDb,
  HistorialCambio as HistorialDb,
  Inventario as InventarioDb,
  Museo as MuseoDb,
  Organizacion as OrganizacionDb,
  Pieza as PiezaDb,
  Prestamo as PrestamoDb,
  Usuario as UsuarioDb,
} from "./generado/client";
import type {
  Categoria,
  DetalleInventario,
  Disponibilidad,
  EstadoConservacion,
  Exposicion,
  HistorialCambio,
  Inventario,
  Museo,
  Organizacion,
  Pieza,
  Prestamo,
  ResultadoInventario,
  Rol,
  TipoColeccion,
  Usuario,
} from "../../tipos";

/* De lo que devuelve Prisma a los tipos de lib/tipos.ts: fechas como texto, valores opcionales sin null y decimales como número */

/** Columna date a AAAA-MM-DD con los componentes UTC, sin desplazamiento de zona. */
export const aDia = (fecha: Date): string => fecha.toISOString().slice(0, 10);

/** Marca con hora a ISO en UTC. */
export const aInstante = (fecha: Date): string => fecha.toISOString();

export const aOrganizacion = (f: OrganizacionDb): Organizacion => ({ id: f.id, nombre: f.nombre });

export const aMuseo = (f: MuseoDb): Museo => ({
  id: f.id,
  organizacionId: f.organizacionId,
  nombre: f.nombre,
  prefijo: f.prefijo,
  tipo: f.tipo as TipoColeccion,
  direccion: f.direccion ?? undefined,
  activo: f.activo,
});

export const aCategoria = (f: CategoriaDb): Categoria => ({ id: f.id, organizacionId: f.organizacionId, nombre: f.nombre });

/** contrasena y debeCambiarContrasena no existen en la base: salen vacío y falso hasta que los reemplace Auth. */
export const aUsuario = (f: UsuarioDb & { museos: { museoId: string }[] }): Usuario => ({
  id: f.id,
  organizacionId: f.organizacionId,
  nombre: f.nombre,
  email: f.email,
  rol: f.rol as Rol,
  activo: f.activo,
  museoIds: f.museos.map((m) => m.museoId),
  contrasena: "",
  debeCambiarContrasena: false,
});

export const aPieza = (f: PiezaDb): Pieza => ({
  id: f.id,
  museoId: f.museoId,
  categoriaId: f.categoriaId,
  codigo: f.codigo,
  codigoAnterior: f.codigoAnterior ?? undefined,
  nombre: f.nombre,
  descripcion: f.descripcion ?? undefined,
  anio: f.anio ?? undefined,
  material: f.material ?? undefined,
  estadoConservacion: f.estadoConservacion as EstadoConservacion,
  ubicacionFisica: f.ubicacionFisica ?? undefined,
  imagenUrl: f.imagenUrl ?? undefined,
  disponibilidad: f.disponibilidad as Disponibilidad,
  fechaRegistro: aInstante(f.fechaRegistro),
});

export const aCambio = (f: HistorialDb): HistorialCambio => ({
  id: f.id,
  piezaId: f.piezaId,
  usuarioId: f.usuarioId,
  campoModificado: f.campoModificado,
  valorAnterior: f.valorAnterior ?? undefined,
  valorNuevo: f.valorNuevo ?? undefined,
  fecha: aInstante(f.fecha),
});

export const aExposicion = (f: ExposicionDb & { piezas: { piezaId: string }[] }): Exposicion => ({
  id: f.id,
  museoId: f.museoId,
  nombre: f.nombre,
  descripcion: f.descripcion ?? undefined,
  fechaInicio: aDia(f.fechaInicio),
  fechaFin: aDia(f.fechaFin),
  cancelada: f.cancelada,
  piezaIds: f.piezas.map((p) => p.piezaId),
});

export const aPrestamo = (f: PrestamoDb): Prestamo => ({
  id: f.id,
  piezaId: f.piezaId,
  usuarioId: f.usuarioId,
  institucionDestino: f.institucionDestino,
  responsableReceptor: f.responsableReceptor,
  numeroConvenio: f.numeroConvenio,
  numeroPoliza: f.numeroPoliza,
  valorAsegurado: f.valorAsegurado.toNumber(),
  fechaSalida: aDia(f.fechaSalida),
  fechaDevolucionPrevista: aDia(f.fechaDevolucionPrevista),
  fechaDevolucionReal: f.fechaDevolucionReal ? aDia(f.fechaDevolucionReal) : undefined,
  estadoConservacionSalida: f.estadoConservacionSalida as EstadoConservacion,
  estadoConservacionDevolucion: (f.estadoConservacionDevolucion as EstadoConservacion | null) ?? undefined,
});

export const aInventario = (f: InventarioDb): Inventario => ({
  id: f.id,
  museoId: f.museoId,
  usuarioId: f.usuarioId,
  usuarioCierreId: f.usuarioCierreId ?? undefined,
  fechaInicio: aInstante(f.fechaInicio),
  fechaCierre: f.fechaCierre ? aInstante(f.fechaCierre) : undefined,
  estado: f.estado as Inventario["estado"],
});

export const aDetalle = (f: DetalleDb): DetalleInventario => ({
  id: f.id,
  inventarioId: f.inventarioId,
  piezaId: f.piezaId,
  resultado: f.resultado as ResultadoInventario,
  observacion: f.observacion ?? undefined,
});
