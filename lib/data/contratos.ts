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
  Usuario,
} from "../tipos";

/** El prefijo lo calcula la capa de datos al crear el museo. */
export type NuevoMuseo = Omit<Museo, "id" | "activo" | "organizacionId" | "prefijo">;
export type CambiosMuseo = Partial<Pick<Museo, "nombre" | "tipo" | "direccion">>;

export type NuevoUsuario = Omit<Usuario, "id">;
export type CambiosUsuario = Partial<Pick<Usuario, "nombre" | "email" | "rol" | "museoIds">>;

/** Nace "disponible" y con fecha de registro de hoy. El código lo asigna la capa de datos al insertarla. */
export type NuevaPieza = Omit<Pieza, "id" | "codigo" | "fechaRegistro" | "disponibilidad">;
/** Datos editables de una pieza. El museo, el estado de conservación y la disponibilidad tienen operaciones propias. */
export type CambiosPieza = Partial<
  Omit<Pieza, "id" | "codigo" | "museoId" | "estadoConservacion" | "disponibilidad" | "fechaRegistro">
>;

export type NuevaExposicion = Omit<Exposicion, "id" | "cancelada">;
export type CambiosExposicion = Partial<Omit<Exposicion, "id" | "cancelada">>;

export type NuevoPrestamo = Omit<Prestamo, "id" | "fechaDevolucionReal" | "estadoConservacionDevolucion">;
export type DevolucionPrestamo = {
  fechaDevolucionReal: string;
  estadoConservacionDevolucion: EstadoConservacion;
};

export type NuevoInventario = Omit<Inventario, "id" | "usuarioCierreId" | "fechaCierre" | "estado">;

export type NuevoCambio = Omit<HistorialCambio, "id" | "fecha">;

/** Contrato que cumple toda implementación de la capa de datos (memoria hoy, Prisma después). Todo es asíncrono. */
export interface Datos {
  /* Organización */
  obtenerOrganizacion(id: string): Promise<Organizacion | null>;

  /* Museos */
  listarMuseos(organizacionId: string): Promise<Museo[]>;
  obtenerMuseo(id: string): Promise<Museo | null>;
  crearMuseo(organizacionId: string, datos: NuevoMuseo): Promise<Museo>;
  actualizarMuseo(id: string, cambios: CambiosMuseo): Promise<void>;
  cambiarActivoMuseo(id: string, activo: boolean): Promise<void>;

  /* Usuarios */
  listarUsuarios(organizacionId: string): Promise<Usuario[]>;
  obtenerUsuario(id: string): Promise<Usuario | null>;
  obtenerUsuarioPorEmail(email: string): Promise<Usuario | null>;
  crearUsuario(datos: NuevoUsuario): Promise<Usuario>;
  actualizarUsuario(id: string, cambios: CambiosUsuario): Promise<void>;
  cambiarActivoUsuario(id: string, activo: boolean): Promise<void>;
  actualizarContrasena(id: string, contrasena: string): Promise<void>;

  /* Categorías */
  listarCategorias(organizacionId: string): Promise<Categoria[]>;

  /* Piezas */
  listarPiezas(): Promise<Pieza[]>;
  obtenerPieza(id: string): Promise<Pieza | null>;
  buscarPiezaPorCodigoAnterior(museoId: string, codigoAnterior: string): Promise<Pieza | null>;
  /** Asigna el código correlativo del museo en la misma operación que inserta la pieza. */
  crearPieza(datos: NuevaPieza): Promise<Pieza>;
  /** Inserta todas las piezas asignando los códigos en el orden recibido. */
  crearPiezas(datos: NuevaPieza[]): Promise<Pieza[]>;
  actualizarPieza(id: string, cambios: CambiosPieza): Promise<void>;
  actualizarEstadoPieza(id: string, estado: EstadoConservacion): Promise<void>;
  actualizarDisponibilidadPieza(id: string, disponibilidad: Disponibilidad): Promise<void>;

  /* Exposiciones */
  listarExposiciones(): Promise<Exposicion[]>;
  obtenerExposicion(id: string): Promise<Exposicion | null>;
  crearExposicion(datos: NuevaExposicion): Promise<Exposicion>;
  actualizarExposicion(id: string, cambios: CambiosExposicion): Promise<void>;
  cancelarExposicion(id: string): Promise<void>;

  /* Préstamos */
  listarPrestamos(): Promise<Prestamo[]>;
  obtenerPrestamo(id: string): Promise<Prestamo | null>;
  crearPrestamo(datos: NuevoPrestamo): Promise<Prestamo>;
  registrarDevolucion(id: string, datos: DevolucionPrestamo): Promise<void>;

  /* Inventarios */
  listarInventarios(): Promise<Inventario[]>;
  obtenerInventario(id: string): Promise<Inventario | null>;
  crearInventario(datos: NuevoInventario): Promise<Inventario>;
  marcarResultadoInventario(
    inventarioId: string,
    piezaId: string,
    resultado: ResultadoInventario,
    observacion?: string,
  ): Promise<DetalleInventario>;
  listarDetalleInventario(inventarioId: string): Promise<DetalleInventario[]>;
  cerrarInventario(id: string, fechaCierre: string, usuarioCierreId: string): Promise<void>;

  /* Historial */
  listarHistorialPieza(piezaId: string): Promise<HistorialCambio[]>;
  registrarCambio(datos: NuevoCambio): Promise<HistorialCambio>;

  /* Datos de demostración */
  restablecerDatos(): Promise<void>;
}
