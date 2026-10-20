/*
 * Todos los ids son texto con formato uuid. Los valores fijos se guardan en minúscula;
 * la interfaz los muestra con sus etiquetas (lib/constantes.ts).
 */

export type Rol = "administrador" | "colaborador";
/** Tipo de colección del museo. */
export type TipoColeccion = "arqueologia" | "historico" | "arte" | "ciencias_naturales" | "otro";
export type EstadoConservacion = "bueno" | "regular" | "malo";
export type Disponibilidad = "disponible" | "en_prestamo" | "pendiente_verificacion";
export type EstadoInventario = "en_curso" | "cerrado";
export type ResultadoInventario = "encontrada" | "no_encontrada" | "con_dano";
/** Calculado, no se guarda. */
export type EstadoExposicion = "programada" | "vigente" | "finalizada" | "cancelada";
/** Calculada, no se guarda. */
export type SituacionPrestamo = "en_prestamo" | "vencido" | "devuelto";

export type Organizacion = { id: string; nombre: string };

export type Usuario = {
  id: string;
  organizacionId: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  museoIds: string[]; // equivale a usuario_museo
};

export type Museo = {
  id: string;
  organizacionId: string;
  nombre: string;
  /** Lo asigna el sistema al registrar el museo y no cambia nunca. Único dentro de la organización. */
  prefijo: string;
  tipo: TipoColeccion;
  direccion?: string;
  activo: boolean;
};

export type Categoria = { id: string; organizacionId: string; nombre: string };

export type Pieza = {
  id: string;
  museoId: string;
  categoriaId: string;
  /** Lo asigna el sistema al guardar (prefijo del museo y correlativo) y no cambia nunca. */
  codigo: string;
  /** Código que la pieza tenía antes, opcional. Único dentro del museo cuando existe. */
  codigoAnterior?: string;
  nombre: string;
  descripcion?: string;
  anio?: number;
  material?: string;
  estadoConservacion: EstadoConservacion;
  ubicacionFisica?: string;
  imagenUrl?: string;
  disponibilidad: Disponibilidad;
  fechaRegistro: string; // fecha y hora ISO
};

export type HistorialCambio = {
  id: string;
  piezaId: string;
  usuarioId: string;
  campoModificado: string;
  valorAnterior?: string;
  valorNuevo?: string;
  fecha: string; // fecha y hora ISO
};

export type Exposicion = {
  id: string;
  museoId: string;
  nombre: string;
  descripcion?: string;
  fechaInicio: string; // fecha ISO, solo día
  fechaFin: string; // fecha ISO, solo día
  cancelada: boolean;
  piezaIds: string[]; // equivale a pieza_exposicion
};

export type Prestamo = {
  id: string;
  piezaId: string;
  usuarioId: string;
  institucionDestino: string;
  responsableReceptor: string;
  numeroConvenio: string;
  numeroPoliza: string;
  valorAsegurado: number;
  fechaSalida: string; // fecha ISO, solo día
  fechaDevolucionPrevista: string; // fecha ISO, solo día
  fechaDevolucionReal?: string; // fecha ISO, solo día
  estadoConservacionSalida: EstadoConservacion;
  estadoConservacionDevolucion?: EstadoConservacion;
};

export type Inventario = {
  id: string;
  museoId: string;
  usuarioId: string; // quien inició el inventario
  usuarioCierreId?: string; // quien lo cerró: vacío mientras está en curso
  fechaInicio: string; // fecha y hora ISO
  fechaCierre?: string; // fecha y hora ISO
  estado: EstadoInventario;
};

export type DetalleInventario = {
  id: string;
  inventarioId: string;
  piezaId: string;
  resultado: ResultadoInventario;
  observacion?: string;
};

/* Tipos de apoyo para las vistas y los controladores */

/** El indicador de cambio de contraseña pendiente sale de la cuenta de Auth, no de la base. */
export type UsuarioPublico = Usuario & { debeCambiarContrasena: boolean };

export type UsuarioListado = Usuario & { museos: string[] };

export type Vigencia = "todas" | EstadoExposicion;

export type PiezaListado = Pieza & { museoNombre: string; categoriaNombre: string; enExhibicion: boolean };

export type ExposicionListado = Exposicion & {
  museoNombre: string;
  estado: EstadoExposicion;
  cantidadPiezas: number;
};

export type PrestamoListado = Prestamo & {
  museoId: string;
  piezaCodigo: string;
  piezaNombre: string;
  museoNombre: string;
  situacion: SituacionPrestamo;
};

export type InventarioListado = Inventario & { museoNombre: string; iniciadoPorNombre: string; cerradoPorNombre?: string };

/** Una pieza de un inventario, con su marca si ya fue marcada. */
export type FilaInventario = {
  piezaId: string;
  codigo: string;
  nombre: string;
  ubicacionFisica?: string;
  imagenUrl?: string;
  resultado?: ResultadoInventario;
  observacion?: string;
};

export type ResumenInventario = {
  encontradas: number;
  noEncontradas: FilaInventario[];
  conDano: FilaInventario[];
};

export type PiezaResumen = { id: string; nombre: string; imagenUrl?: string };

export type FiltrosPiezas = {
  codigo?: string;
  nombre?: string;
  categoriaId?: string;
  estado?: string;
  disponibilidad?: string;
  museoId?: string;
  /** Solo piezas con disponibilidad "disponible". Lo aplica el servidor. */
  soloDisponibles?: boolean;
};

export type FiltrosExposiciones = {
  nombre?: string;
  vigencia?: Vigencia;
  museoId?: string;
};

export type FiltrosReporte = {
  categoriaId?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
};

export type FilaReporte = {
  categoria: string;
  porEstado: Record<string, number>;
  total: number;
};

export type Reporte = {
  estados: EstadoConservacion[];
  filas: FilaReporte[];
  totalesPorEstado: Record<string, number>;
  totalGeneral: number;
};

/* Reporte de piezas */

export type FiltrosReportePiezas = { museoId?: string; disponibilidad?: string; desde?: string; hasta?: string };

export type FilaReportePiezas = {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  estadoConservacion: EstadoConservacion;
  disponibilidad: Disponibilidad;
  museo: string;
  ubicacion?: string;
  /** Día local de registro, AAAA-MM-DD. */
  fechaRegistro: string;
};

export type ReportePiezas = { filas: FilaReportePiezas[]; total: number };

/* Reporte de exposiciones */

export type FiltrosReporteExposiciones = { museoId?: string; estado?: string; desde?: string; hasta?: string };

export type FilaReporteExposiciones = {
  id: string;
  nombre: string;
  museo: string;
  estado: EstadoExposicion;
  fechaInicio: string;
  fechaFin: string;
  cantidadPiezas: number;
  piezas: { codigo: string; nombre: string }[];
};

export type ReporteExposiciones = { filas: FilaReporteExposiciones[]; total: number };

/* Reporte de préstamos */

export type FiltrosReportePrestamos = {
  museoId?: string;
  situacion?: string;
  institucion?: string;
  desde?: string;
  hasta?: string;
};

export type FilaReportePrestamos = {
  id: string;
  piezaCodigo: string;
  piezaNombre: string;
  museo: string;
  institucionDestino: string;
  responsableReceptor: string;
  numeroConvenio: string;
  numeroPoliza: string;
  valorAsegurado: number;
  fechaSalida: string;
  fechaDevolucionPrevista: string;
  fechaDevolucionReal?: string;
  situacion: SituacionPrestamo;
};

export type ReportePrestamos = { filas: FilaReportePrestamos[]; total: number };

/** Respuesta común de las acciones de los controladores. */
export type Resultado<T = never> =
  | { ok: true; mensaje?: string; datos?: T }
  | { ok: false; error: string };

/** Pieza que no puede asignarse a una exposición, con el motivo. */
export type ConflictoPieza = { piezaId: string; piezaNombre: string; motivo: string };

export type ResultadoGuardarExposicion =
  | { ok: true; mensaje: string }
  | { ok: false; error: string; conflictos?: ConflictoPieza[] };

/** Respuesta de una acción de formulario que puede devolver un error por campo además del error general. */
export type ResultadoCampos<C extends string> =
  | { ok: true; mensaje?: string }
  | { ok: false; error?: string; errores?: Partial<Record<C, string>> };

/** Cuentas de demostración que muestra el inicio de sesión. Las lee el servidor y solo se envían si MOSTRAR_DATOS_DEMO es true. */
export type DatosDemo = {
  contrasena: string;
  cuentas: { clave: string; nombre: string; rol: Rol; activo: boolean; correo: string; museos: string[] }[];
  soloAdministrador: string[];
};
