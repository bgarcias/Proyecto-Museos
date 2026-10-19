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

/** El id es opcional: la memoria genera uno si no viene. Con la base real será el id de la cuenta de Auth y se exigirá. */
export type NuevoUsuario = Omit<Usuario, "id" | "organizacionId"> & { id?: string };
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

/*
 * Contrato que cumple toda implementación de la capa de datos (memoria hoy, Prisma después). Todo es asíncrono.
 *
 * Aislamiento por organización: toda función que lee o escribe por id, o que lista, recibe organizacionId y solo
 * opera dentro de esa organización. Lo que no tiene columna de organización (pieza, exposición, préstamo,
 * inventario, detalle de inventario e historial) se filtra por la organización de su museo.
 * Una lectura por id devuelve null si es de otra organización. Una escritura sobre algo de otra organización
 * no hace nada, como si no existiera. Las creaciones lanzan un error si lo que referencian es de otra organización.
 *
 * Solo tres funciones operan sin organización, porque resuelven la identidad antes de saber cuál es:
 * obtenerUsuarioPorId (la sesión), obtenerUsuarioPorEmail (el inicio de sesión y el correo único) y actualizarContrasena.
 */
export interface Datos {
  /* Organización */
  obtenerOrganizacion(organizacionId: string): Promise<Organizacion | null>;

  /* Museos */
  listarMuseos(organizacionId: string): Promise<Museo[]>;
  obtenerMuseo(organizacionId: string, id: string): Promise<Museo | null>;
  crearMuseo(organizacionId: string, datos: NuevoMuseo): Promise<Museo>;
  actualizarMuseo(organizacionId: string, id: string, cambios: CambiosMuseo): Promise<void>;
  cambiarActivoMuseo(organizacionId: string, id: string, activo: boolean): Promise<void>;

  /* Usuarios */
  listarUsuarios(organizacionId: string): Promise<Usuario[]>;
  obtenerUsuario(organizacionId: string, id: string): Promise<Usuario | null>;
  /** Identidad de la sesión: se busca antes de saber la organización, que sale de la fila encontrada. */
  obtenerUsuarioPorId(id: string): Promise<Usuario | null>;
  /** El correo es único en toda la base, por eso no lleva organización. */
  obtenerUsuarioPorEmail(email: string): Promise<Usuario | null>;
  crearUsuario(organizacionId: string, datos: NuevoUsuario): Promise<Usuario>;
  actualizarUsuario(organizacionId: string, id: string, cambios: CambiosUsuario): Promise<void>;
  cambiarActivoUsuario(organizacionId: string, id: string, activo: boolean): Promise<void>;
  actualizarContrasena(id: string, contrasena: string): Promise<void>;

  /* Categorías */
  listarCategorias(organizacionId: string): Promise<Categoria[]>;

  /* Piezas */
  listarPiezas(organizacionId: string): Promise<Pieza[]>;
  obtenerPieza(organizacionId: string, id: string): Promise<Pieza | null>;
  buscarPiezaPorCodigoAnterior(organizacionId: string, museoId: string, codigoAnterior: string): Promise<Pieza | null>;
  /** Asigna el código correlativo del museo en la misma operación que inserta la pieza. */
  crearPieza(organizacionId: string, datos: NuevaPieza): Promise<Pieza>;
  /** Inserta todas las piezas asignando los códigos en el orden recibido. */
  crearPiezas(organizacionId: string, datos: NuevaPieza[]): Promise<Pieza[]>;
  actualizarPieza(organizacionId: string, id: string, cambios: CambiosPieza): Promise<void>;
  actualizarEstadoPieza(organizacionId: string, id: string, estado: EstadoConservacion): Promise<void>;
  actualizarDisponibilidadPieza(organizacionId: string, id: string, disponibilidad: Disponibilidad): Promise<void>;

  /* Exposiciones */
  listarExposiciones(organizacionId: string): Promise<Exposicion[]>;
  obtenerExposicion(organizacionId: string, id: string): Promise<Exposicion | null>;
  crearExposicion(organizacionId: string, datos: NuevaExposicion): Promise<Exposicion>;
  actualizarExposicion(organizacionId: string, id: string, cambios: CambiosExposicion): Promise<void>;
  cancelarExposicion(organizacionId: string, id: string): Promise<void>;

  /* Préstamos */
  listarPrestamos(organizacionId: string): Promise<Prestamo[]>;
  obtenerPrestamo(organizacionId: string, id: string): Promise<Prestamo | null>;
  crearPrestamo(organizacionId: string, datos: NuevoPrestamo): Promise<Prestamo>;
  registrarDevolucion(organizacionId: string, id: string, datos: DevolucionPrestamo): Promise<void>;

  /* Inventarios */
  listarInventarios(organizacionId: string): Promise<Inventario[]>;
  obtenerInventario(organizacionId: string, id: string): Promise<Inventario | null>;
  crearInventario(organizacionId: string, datos: NuevoInventario): Promise<Inventario>;
  marcarResultadoInventario(
    organizacionId: string,
    inventarioId: string,
    piezaId: string,
    resultado: ResultadoInventario,
    observacion?: string,
  ): Promise<DetalleInventario>;
  listarDetalleInventario(organizacionId: string, inventarioId: string): Promise<DetalleInventario[]>;
  cerrarInventario(organizacionId: string, id: string, fechaCierre: string, usuarioCierreId: string): Promise<void>;

  /* Historial */
  listarHistorialPieza(organizacionId: string, piezaId: string): Promise<HistorialCambio[]>;
  registrarCambio(organizacionId: string, datos: NuevoCambio): Promise<HistorialCambio>;

  /* Datos de demostración */
  restablecerDatos(): Promise<void>;
}
