import type {
  Disponibilidad,
  EstadoConservacion,
  EstadoExposicion,
  EstadoInventario,
  ResultadoInventario,
  Rol,
  SituacionPrestamo,
  TipoColeccion,
  Vigencia,
} from "./tipos";

/*
 * Valores fijos (en minúscula, como se guardan) y sus etiquetas para la interfaz.
 * Las categorías no son fijas: son datos de cada organización.
 */

export const ROLES: readonly Rol[] = ["administrador", "colaborador"];
export const ETIQUETAS_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  colaborador: "Colaborador",
};

export const TIPOS_COLECCION: readonly TipoColeccion[] = ["arqueologia", "historico", "arte", "ciencias_naturales", "otro"];
export const ETIQUETAS_TIPO_COLECCION: Record<TipoColeccion, string> = {
  arqueologia: "Arqueología, antropología o etnología",
  historico: "Histórico",
  arte: "Arte",
  ciencias_naturales: "Ciencias naturales",
  otro: "Otro",
};

export const ESTADOS_CONSERVACION: readonly EstadoConservacion[] = ["bueno", "regular", "malo"];
export const ETIQUETAS_ESTADO_CONSERVACION: Record<EstadoConservacion, string> = {
  bueno: "Bueno",
  regular: "Regular",
  malo: "Malo",
};

export const DISPONIBILIDADES: readonly Disponibilidad[] = ["disponible", "en_prestamo", "pendiente_verificacion"];
export const ETIQUETAS_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  disponible: "Disponible",
  en_prestamo: "En préstamo",
  pendiente_verificacion: "Pendiente de verificación",
};

export const ETIQUETAS_ESTADO_INVENTARIO: Record<EstadoInventario, string> = {
  en_curso: "En curso",
  cerrado: "Cerrado",
};

/** Etiquetas de la persona que inició y de la que cerró un inventario. */
export const ETIQUETA_INVENTARIO_INICIADO_POR = "Iniciado por";
export const ETIQUETA_INVENTARIO_CERRADO_POR = "Cerrado por";

export const RESULTADOS_INVENTARIO: readonly ResultadoInventario[] = ["encontrada", "no_encontrada", "con_dano"];
export const ETIQUETAS_RESULTADO_INVENTARIO: Record<ResultadoInventario, string> = {
  encontrada: "Encontrada",
  no_encontrada: "No encontrada",
  con_dano: "Con daño",
};

export const ETIQUETAS_ESTADO_EXPOSICION: Record<EstadoExposicion, string> = {
  programada: "Programada",
  vigente: "Vigente",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const VIGENCIAS: readonly Vigencia[] = ["todas", "programada", "vigente", "finalizada", "cancelada"];

export const ETIQUETAS_SITUACION_PRESTAMO: Record<SituacionPrestamo, string> = {
  en_prestamo: "En préstamo",
  vencido: "Vencido",
  devuelto: "Devuelto",
};

export const IMAGEN_MARCADOR = "/piezas/sin-imagen.svg";

/** Límite de años desde hoy para las fechas de exposiciones y para la devolución prevista de un préstamo. */
export const LIMITE_ANIOS_FECHAS = 3;

/* Préstamos: validación compartida por la vista y el controlador */
export const MENSAJE_PRESTAMO_ESTADO_DEVOLUCION = "Selecciona el estado de conservación de la pieza";
export const MENSAJE_PRESTAMO_SALIDA_FUTURA = "La fecha de salida no puede ser posterior a hoy";
export const MENSAJE_PRESTAMO_DEVOLUCION_LIMITE = `La fecha de devolución no puede superar los ${LIMITE_ANIOS_FECHAS} años desde hoy`;
export const MAXIMO_INSTITUCION_DESTINO = 100;
export const MAXIMO_RESPONSABLE_RECEPTOR = 100;
export const MAXIMO_NUMERO_CONVENIO = 40;
export const MAXIMO_NUMERO_POLIZA = 40;
export const MENSAJE_INSTITUCION_LARGA = `La institución destino no puede tener más de ${MAXIMO_INSTITUCION_DESTINO} caracteres`;
export const MENSAJE_RESPONSABLE_LARGO = `El responsable no puede tener más de ${MAXIMO_RESPONSABLE_RECEPTOR} caracteres`;
export const MENSAJE_CONVENIO_LARGO = `El número de convenio no puede tener más de ${MAXIMO_NUMERO_CONVENIO} caracteres`;
export const MENSAJE_POLIZA_LARGA = `El número de póliza no puede tener más de ${MAXIMO_NUMERO_POLIZA} caracteres`;

/* Exposiciones: validaciones compartidas por la vista y el controlador */
export const MENSAJE_EXPOSICION_SIN_PIEZAS = "Agrega al menos una pieza a la exposición";
export const MENSAJE_EXPOSICION_FECHAS_LIMITE = `Las fechas no pueden superar los ${LIMITE_ANIOS_FECHAS} años desde hoy`;

/* Reporte por categoría y estado */
export const TITULO_REPORTE = "Reporte por categoría y estado";
export const TITULO_RESULTADOS_REPORTE = "Total de piezas por categoría y estado";
export const DETALLE_REPORTES_INICIO = "Reportes de la colección";
export const ETIQUETA_PROXIMAMENTE = "Próximamente";
export const TITULO_REPORTE_PIEZAS = "Reporte de piezas";
export const DETALLE_REPORTE_PIEZAS = "Listado de piezas con sus datos";
export const TITULO_REPORTE_EXPOSICIONES = "Reporte de exposiciones";
export const DETALLE_REPORTE_EXPOSICIONES = "Listado de exposiciones con sus piezas";
export const TITULO_REPORTE_PRESTAMOS = "Reporte de préstamos";
export const DETALLE_REPORTE_PRESTAMOS = "Listado de préstamos y devoluciones";

/**
 * Zona horaria única del sistema: todo día y hora sacados de una marca de tiempo se convierten a ella de forma explícita,
 * sin depender del proceso, el servidor ni el navegador. Las marcas se guardan en UTC y las fechas de solo día (AAAA-MM-DD) nunca se convierten.
 */
export const ZONA_HORARIA = "America/Lima";

/* Validaciones comunes de los reportes */
export const MENSAJE_RANGO_FECHAS_INVALIDO = "La fecha desde no puede ser posterior a la fecha hasta";
export const MENSAJE_SIN_RESULTADOS = "No se encontraron resultados para los filtros aplicados";
export const MENSAJE_FILTRO_INVALIDO = "Alguno de los filtros del reporte no es válido";
export const MENSAJE_FECHA_FORMATO = "Las fechas del reporte deben tener el formato AAAA-MM-DD";
export const MENSAJE_SIN_ACCESO_MUSEO = "No tienes acceso al museo seleccionado";

/** Error del rango de fechas de un reporte: desde no puede ser posterior a hasta. Con un solo extremo no hay error. */
export function errorDeRangoFechas(desde?: string, hasta?: string): string | undefined {
  return desde && hasta && desde > hasta ? MENSAJE_RANGO_FECHAS_INVALIDO : undefined;
}

/** True si el texto es una fecha real con formato AAAA-MM-DD. */
export function esFechaIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split("-").map(Number);
  // Aritmética en UTC: la validez de un día de calendario no depende de ninguna zona horaria.
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/* Textos de los reportes de piezas, exposiciones y préstamos */
export const TEXTO_TODOS = "Todos";
export const TEXTO_TODAS = "Todas";
export const TEXTO_SIN_LIMITE = "Sin límite";

/* Etiquetas de los datos de una pieza, compartidas por pantallas, fichas y archivos de importación y reportes */
export const ETIQUETA_CATEGORIA = "Categoría";
export const ETIQUETA_DISPONIBILIDAD = "Disponibilidad";
export const ETIQUETA_FECHA_REGISTRO = "Fecha de registro";
export const ETIQUETA_ESTADO_CONSERVACION = "Estado de conservación";
export const ETIQUETA_UBICACION_FISICA = "Ubicación física";
export const ETIQUETA_CODIGO_ANTERIOR = "Código anterior";
export const MENSAJE_PIEZA_NO_ENCONTRADA = "No se encontró la pieza";

export const TITULO_RESULTADOS_REPORTE_PIEZAS = "Listado de piezas por museo";
export const TITULO_RESULTADOS_REPORTE_EXPOSICIONES = "Listado de exposiciones con sus piezas";
export const TITULO_RESULTADOS_REPORTE_PRESTAMOS = "Listado de préstamos y devoluciones";
export const TOTAL_PIEZAS = "Total de piezas";
export const TOTAL_EXPOSICIONES = "Total de exposiciones";
export const TOTAL_PRESTAMOS = "Total de préstamos";

export const ETIQUETAS_FILTROS_REPORTE = {
  museo: "Museo",
  disponibilidad: ETIQUETA_DISPONIBILIDAD,
  estado: "Estado",
  situacion: "Situación",
  institucion: "Institución destino",
  desde: "Desde",
  hasta: "Hasta",
} as const;

export const COLUMNAS_REPORTE_PIEZAS = {
  codigo: "Código",
  nombre: "Nombre",
  categoria: ETIQUETA_CATEGORIA,
  estado: "Estado",
  disponibilidad: ETIQUETA_DISPONIBILIDAD,
  museo: "Museo",
  ubicacion: "Ubicación",
  fechaRegistro: ETIQUETA_FECHA_REGISTRO,
} as const;

export const COLUMNAS_REPORTE_EXPOSICIONES = {
  nombre: "Nombre",
  museo: "Museo",
  estado: "Estado",
  inicio: "Inicio",
  fin: "Fin",
  cantidad: "Cantidad de piezas",
  piezas: "Piezas",
} as const;

export const COLUMNAS_REPORTE_PRESTAMOS = {
  pieza: "Pieza",
  museo: "Museo",
  institucion: "Institución destino",
  responsable: "Responsable",
  convenio: "Convenio",
  poliza: "Póliza",
  valor: "Valor asegurado",
  salida: "Salida",
  devolucionPrevista: "Devolución prevista",
  devolucionReal: "Devolución real",
  situacion: "Situación",
} as const;

/** Campos del historial cuyo valor es un valor fijo. El resto se guarda como texto libre. */
export const CAMPO_ESTADO_CONSERVACION = "estado de conservación";
export const CAMPO_DISPONIBILIDAD = "disponibilidad";

/** Nombre del campo modificado para mostrarlo: primera letra en mayúscula. Lo guardado no cambia. */
export function etiquetaCampoHistorial(campo: string): string {
  return campo.charAt(0).toUpperCase() + campo.slice(1);
}

/** Etiqueta de un valor del historial: valores fijos con su etiqueta, texto libre tal cual. */
export function etiquetaValorHistorial(campo: string, valor?: string): string {
  if (!valor) return "-";
  if (campo === CAMPO_ESTADO_CONSERVACION) {
    return ETIQUETAS_ESTADO_CONSERVACION[valor as EstadoConservacion] ?? valor;
  }
  if (campo === CAMPO_DISPONIBILIDAD) {
    return ETIQUETAS_DISPONIBILIDAD[valor as Disponibilidad] ?? valor;
  }
  return valor;
}

/** Página 404: mismo texto para una dirección inexistente y para un recurso que el sistema no muestra. */
export const TEXTO_CODIGO_404 = "404";
export const TEXTO_MENSAJE_404 = "Esta página no se encontró";
export const ETIQUETA_VOLVER_AL_INICIO = "Volver al inicio";

/** Menú de navegación compacto: etiquetas del botón y la misma consulta de ancho que la media query de tablet. */
export const ETIQUETA_ABRIR_MENU = "Abrir menú";
export const ETIQUETA_CERRAR_MENU = "Cerrar menú";
export const CONSULTA_MENU_COMPACTO = "(max-width: 1025px)";

/** Mensaje de un error que no se esperaba. El detalle queda solo en el registro del servidor. */
export const MENSAJE_ERROR_INESPERADO = "Ocurrió un error inesperado. Intenta de nuevo";
export const MENSAJE_CONTRASENA_DEBIL = "La contraseña no es lo bastante segura. Elige otra";

/** Recuadro de cuentas de demostración del inicio de sesión (solo con MOSTRAR_DATOS_DEMO en true). */
export const TITULO_DATOS_DEMO = "Cuentas de demostración";
export const ETIQUETA_DEMO_ADMINISTRADOR = "Administrador";
export const ETIQUETA_DEMO_COLABORADOR = "Colaborador";
export const ETIQUETA_DEMO_CORREO = "Correo";
export const ETIQUETA_DEMO_CONTRASENA = "Contraseña";
