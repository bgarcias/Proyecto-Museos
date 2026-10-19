import { calcularPrefijoMuseo, formatearCodigo } from "../../codigos";
import { diasDesdeHoy, instanteDeLima } from "../../fechas";
import { errorDeLongitudContrasena } from "../../validaciones";
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
  Usuario,
} from "../../tipos";

export const CONTRASENA_DEMO = "Museos2026";

// La contraseña de demostración debe cumplir las mismas reglas de longitud que cualquier otra.
if (errorDeLongitudContrasena(CONTRASENA_DEMO)) throw new Error("La contraseña de demostración no cumple las reglas de contraseña");

export type Almacen = {
  organizaciones: Organizacion[];
  museos: Museo[];
  usuarios: Usuario[];
  categorias: Categoria[];
  piezas: Pieza[];
  historial: HistorialCambio[];
  exposiciones: Exposicion[];
  prestamos: Prestamo[];
  inventarios: Inventario[];
  detallesInventario: DetalleInventario[];
};

/* Ids fijos con formato uuid, para que las referencias de la semilla sean estables. */
const TIPO = {
  organizacion: 1,
  museo: 2,
  usuario: 3,
  categoria: 4,
  pieza: 5,
  historial: 6,
  exposicion: 7,
  prestamo: 8,
  inventario: 9,
  detalle: 10,
} as const;

function uuid(tipo: number, n: number): string {
  return `${String(tipo).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

/** Fecha y hora ISO (UTC) de hace N días, a la hora de reloj de Lima indicada. Parte del hoy de Lima. */
function hace(dias: number, hora = 10): string {
  return instanteDeLima(diaHace(dias), hora);
}

/** Fecha ISO (solo día) de hace N días. */
function diaHace(dias: number): string {
  return diasDesdeHoy(-dias);
}

export function crearDatosIniciales(): Almacen {
  const organizacionId = uuid(TIPO.organizacion, 1);
  const organizaciones: Organizacion[] = [{ id: organizacionId, nombre: "Organización de demostración" }];

  /* Museos */
  const M = {
    teatro: uuid(TIPO.museo, 1),
    pinacoteca: uuid(TIPO.museo, 2),
    quinones: uuid(TIPO.museo, 3),
    santaRosa: uuid(TIPO.museo, 4),
  };
  const museos: Museo[] = [
    { id: M.teatro, organizacionId, nombre: "Museo Municipal de Teatro", prefijo: "", tipo: "otro", activo: true },
    { id: M.pinacoteca, organizacionId, nombre: "Pinacoteca Municipal Ignacio Merino", prefijo: "", tipo: "arte", activo: true },
    {
      id: M.quinones,
      organizacionId,
      nombre: "Museo Casa Quiñones", prefijo: "",
      tipo: "historico",
      direccion: "Jr. Ancash 310, Lima",
      activo: true,
    },
    {
      id: M.santaRosa,
      organizacionId,
      nombre: "Sala Cultural Santa Rosa", prefijo: "",
      tipo: "otro",
      direccion: "Av. Santa Rosa 120, Lima",
      activo: false, // cerrada por remodelación
    },
  ];

  /* Usuarios */
  const U = {
    brandon: uuid(TIPO.usuario, 1),
    gabriela: uuid(TIPO.usuario, 2),
    marco: uuid(TIPO.usuario, 3),
    miguel: uuid(TIPO.usuario, 4),
    lucia: uuid(TIPO.usuario, 5),
    diego: uuid(TIPO.usuario, 6),
  };
  const u = (id: string, nombre: string, email: string, rol: Rol, museoIds: string[], activo = true): Usuario => ({
    id,
    organizacionId,
    nombre,
    email,
    rol,
    activo,
    museoIds,
    contrasena: CONTRASENA_DEMO,
    debeCambiarContrasena: false,
  });
  const usuarios: Usuario[] = [
    u(U.brandon, "Brandon Garcia Sanchez", "brandon.garcia@example.com", "administrador", [M.teatro, M.pinacoteca, M.quinones]),
    u(U.gabriela, "Gabriela Linares Ortega", "gabriela.linares@example.com", "colaborador", [M.teatro, M.pinacoteca]),
    u(U.marco, "Marco Aguirre Soto", "marco.aguirre@example.com", "colaborador", [M.teatro]),
    u(U.miguel, "Miguel Zambrano Melendez", "miguel.zambrano@example.com", "colaborador", [M.pinacoteca]),
    u(U.lucia, "Lucía Paredes Vargas", "lucia.paredes@example.com", "colaborador", [M.quinones]),
    u(U.diego, "Diego Salazar Rojas", "diego.salazar@example.com", "colaborador", [M.teatro], false),
  ];

  // Los prefijos se calculan con la misma regla que usa el registro de museos.
  const prefijosAsignados: string[] = [];
  for (const m of museos) {
    m.prefijo = calcularPrefijoMuseo(m.nombre, prefijosAsignados);
    prefijosAsignados.push(m.prefijo);
  }
  const prefijoDe = (museoId: string): string => museos.find((m) => m.id === museoId)!.prefijo;

  /* Categorías */
  const nombresCategoria = ["Arqueológico", "Pintura", "Escultura", "Cerámica", "Textil", "Orfebrería", "Documento", "Otro"];
  const categorias: Categoria[] = nombresCategoria.map((nombre, i) => ({
    id: uuid(TIPO.categoria, i + 1),
    organizacionId,
    nombre,
  }));
  const cat = (nombre: string): string => categorias.find((c) => c.nombre === nombre)!.id;

  /* Piezas. Las 12 primeras son las existentes, luego 2 del Teatro (para el inventario 1) y las 7 nuevas. */
  const p = (
    n: number,
    museoId: string,
    numero: number,
    nombre: string,
    categoria: string,
    estadoConservacion: EstadoConservacion,
    disponibilidad: Disponibilidad,
    ubicacionFisica: string,
    diasRegistro: number,
    extra: { anio?: number; material?: string; descripcion?: string; codigoAnterior?: string },
  ): Pieza => ({
    id: uuid(TIPO.pieza, n),
    museoId,
    categoriaId: cat(categoria),
    codigo: formatearCodigo(prefijoDe(museoId), numero),
    codigoAnterior: extra.codigoAnterior,
    nombre,
    estadoConservacion,
    disponibilidad,
    ubicacionFisica,
    fechaRegistro: hace(diasRegistro),
    anio: extra.anio,
    material: extra.material,
    descripcion: extra.descripcion,
  });

  const piezas: Pieza[] = [
    p(1, M.teatro, 1, "Máscara teatral de yeso", "Escultura", "bueno", "disponible", "Sala 1, Vitrina 1", 200, { anio: 1950, material: "Yeso pintado", descripcion: "Máscara de uso escénico, pieza de demostración." }),
    p(2, M.teatro, 2, "Vestuario de época", "Textil", "regular", "disponible", "Sala 2, Maniquí 3", 170, { anio: 1930, material: "Terciopelo y encaje", descripcion: "Vestuario de demostración para una puesta clásica." }),
    p(3, M.teatro, 3, "Libreto manuscrito", "Documento", "malo", "disponible", "Depósito A, Estante 2", 140, { anio: 1920, material: "Papel y tinta", descripcion: "Libreto anotado a mano, pieza de demostración." }),
    p(4, M.teatro, 4, "Boceto de escenografía", "Pintura", "bueno", "disponible", "Sala 2, Muro norte", 110, { anio: 1960, material: "Acuarela sobre papel", descripcion: "Boceto de decorado teatral de demostración." }),
    p(5, M.teatro, 5, "Vasija de utilería", "Cerámica", "regular", "disponible", "Depósito A, Estante 4", 220, { anio: 1940, material: "Arcilla", descripcion: "Vasija usada como utilería escénica." }),
    p(6, M.teatro, 6, "Corona de utilería", "Orfebrería", "bueno", "en_prestamo", "Sala 1, Vitrina 3", 40, { anio: 1970, material: "Metal dorado", descripcion: "Corona de escena, pieza de demostración." }),
    p(7, M.pinacoteca, 1, "Retrato de dama al óleo", "Pintura", "regular", "disponible", "Galería 1, Muro este", 190, { anio: 1880, material: "Óleo sobre lienzo", descripcion: "Retrato de demostración, sin relación con obras reales." }),
    p(8, M.pinacoteca, 2, "Paisaje costero", "Pintura", "bueno", "disponible", "Galería 1, Muro sur", 150, { anio: 1895, material: "Óleo sobre lienzo", descripcion: "Paisaje de demostración." }),
    p(9, M.pinacoteca, 3, "Busto de yeso", "Escultura", "malo", "disponible", "Galería 2, Pedestal 1", 120, { anio: 1910, material: "Yeso", descripcion: "Busto de demostración con desgaste visible." }),
    p(10, M.pinacoteca, 4, "Fragmento de cerámica antigua", "Arqueológico", "regular", "en_prestamo", "Depósito B, Cajón 1", 90, { anio: 1200, material: "Cerámica", descripcion: "Fragmento de demostración." }),
    p(11, M.pinacoteca, 5, "Marco tallado", "Otro", "bueno", "disponible", "Depósito B, Estante 2", 50, { anio: 1900, material: "Madera tallada", descripcion: "Marco decorativo de demostración." }),
    p(12, M.pinacoteca, 6, "Tapiz decorativo", "Textil", "malo", "disponible", "Depósito B, Estante 5", 25, { anio: 1925, material: "Lana", descripcion: "Tapiz de demostración con deterioro." }),
    // Piezas adicionales del Teatro: protagonistas del inventario 1 (una con daño y una no encontrada)
    p(13, M.teatro, 7, "Telón de ensayo pintado", "Pintura", "malo", "disponible", "Depósito A, Estante 5", 250, { anio: 1955, material: "Lona pintada", descripcion: "Telón usado en ensayos, con una fisura en la base." }),
    p(14, M.teatro, 8, "Cartel de temporada teatral", "Documento", "bueno", "pendiente_verificacion", "Depósito A, Estante 6", 260, { anio: 1962, material: "Papel impreso", descripcion: "Cartel de una temporada de demostración." }),
    // Piezas nuevas de los museos Casa Quiñones y Sala Cultural Santa Rosa
    p(15, M.quinones, 1, "Mantón bordado de seda", "Textil", "bueno", "disponible", "Sala principal, vitrina 1", 160, { codigoAnterior: "INV-1987-0412", anio: 1910, material: "Seda bordada", descripcion: "Mantón con bordado floral, de uso familiar." }),
    p(16, M.quinones, 2, "Cántaro de cerámica vidriada", "Cerámica", "bueno", "disponible", "Sala principal, repisa 2", 160, { codigoAnterior: "INV-1987-0418", anio: 1890, material: "Cerámica vidriada", descripcion: "Cántaro de uso doméstico." }),
    p(17, M.quinones, 3, "Retrato al óleo de la familia Quiñones", "Pintura", "regular", "en_prestamo", "Galería alta", 150, { anio: 1905, material: "Óleo sobre lienzo", descripcion: "Retrato de familia de colección privada." }),
    p(18, M.quinones, 4, "Cubiertos de plata labrada", "Orfebrería", "bueno", "disponible", "Comedor, vitrina 3", 150, { material: "Plata labrada", descripcion: "Juego de cubiertos del comedor principal." }),
    p(19, M.quinones, 5, "Libro de cuentas de la hacienda", "Documento", "malo", "disponible", "Almacén, estante B", 150, { codigoAnterior: "INV-1991-0107", anio: 1898, material: "Papel y cuero", descripcion: "Libro contable de la hacienda familiar." }),
    p(20, M.santaRosa, 1, "Cartel de la fiesta patronal", "Documento", "regular", "disponible", "Almacén", 100, { anio: 1975, material: "Papel impreso" }),
    p(21, M.santaRosa, 2, "Banco de madera tallada", "Escultura", "bueno", "disponible", "Almacén", 100, { anio: 1940, descripcion: "Banco de madera tallada a mano." }),
  ];
  const P = (n: number): string => uuid(TIPO.pieza, n);

  /* Exposiciones */
  const exposiciones: Exposicion[] = [
    {
      id: uuid(TIPO.exposicion, 1),
      museoId: M.teatro,
      nombre: "Escenas y vestuarios",
      descripcion: "Muestra vigente de piezas del teatro.",
      fechaInicio: diasDesdeHoy(-30),
      fechaFin: diasDesdeHoy(30),
      cancelada: false,
      piezaIds: [P(1), P(2), P(3)],
    },
    {
      id: uuid(TIPO.exposicion, 2),
      museoId: M.teatro,
      nombre: "Libretos y bocetos",
      descripcion: "Exposición programada que coincide en fechas con la vigente.",
      fechaInicio: diasDesdeHoy(10),
      fechaFin: diasDesdeHoy(60),
      cancelada: false,
      piezaIds: [P(4), P(5)],
    },
    {
      id: uuid(TIPO.exposicion, 3),
      museoId: M.pinacoteca,
      nombre: "Retratos y paisajes",
      descripcion: "Exposición temporal ya concluida.",
      fechaInicio: diasDesdeHoy(-90),
      fechaFin: diasDesdeHoy(-30),
      cancelada: false,
      piezaIds: [P(7), P(8)],
    },
    {
      id: uuid(TIPO.exposicion, 4),
      museoId: M.quinones,
      nombre: "Textiles y vida doméstica",
      descripcion: "Objetos de la vida cotidiana de la casa.",
      fechaInicio: diasDesdeHoy(15),
      fechaFin: diasDesdeHoy(45),
      cancelada: false,
      piezaIds: [P(15), P(16), P(18)],
    },
    {
      id: uuid(TIPO.exposicion, 5),
      museoId: M.pinacoteca,
      nombre: "Retratos de época",
      descripcion: "Exposición cancelada antes de su inicio.",
      fechaInicio: diasDesdeHoy(5),
      fechaFin: diasDesdeHoy(25),
      cancelada: true,
      piezaIds: [P(9), P(11)],
    },
    {
      id: uuid(TIPO.exposicion, 6),
      museoId: M.pinacoteca,
      nombre: "Paisaje y costumbres",
      descripcion: "Exposición programada de la Pinacoteca.",
      fechaInicio: diasDesdeHoy(10),
      fechaFin: diasDesdeHoy(40),
      cancelada: false,
      piezaIds: [P(9), P(11)],
    },
  ];

  /* Préstamos */
  const pr = (
    n: number,
    piezaN: number,
    usuarioId: string,
    institucionDestino: string,
    responsableReceptor: string,
    numeroConvenio: string,
    numeroPoliza: string,
    valorAsegurado: number,
    salida: number,
    prevista: number,
    real: number | null,
    estadoSalida: EstadoConservacion,
    estadoDevolucion?: EstadoConservacion,
  ): Prestamo => ({
    id: uuid(TIPO.prestamo, n),
    piezaId: P(piezaN),
    usuarioId,
    institucionDestino,
    responsableReceptor,
    numeroConvenio,
    numeroPoliza,
    valorAsegurado,
    fechaSalida: diaHace(salida),
    fechaDevolucionPrevista: diasDesdeHoy(-prevista),
    fechaDevolucionReal: real === null ? undefined : diaHace(real),
    estadoConservacionSalida: estadoSalida,
    estadoConservacionDevolucion: estadoDevolucion,
  });
  const prestamos: Prestamo[] = [
    // prevista positiva = hace N días; negativa = dentro de N días
    pr(1, 6, U.gabriela, "Centro Cultural Universitario", "María Torres Quispe", "CONV-2026-014", "POL-88421", 4500.0, 10, -20, null, "bueno"),
    pr(2, 10, U.miguel, "Biblioteca Municipal de Cultura", "Jorge Salas Ríos", "CONV-2026-007", "POL-77310", 12000.0, 60, 15, null, "regular"),
    pr(3, 5, U.marco, "Instituto de Artes Escénicas", "Rosa Medina Cruz", "CONV-2026-003", "POL-65102", 3000.0, 90, 40, 30, "bueno", "regular"),
    pr(4, 17, U.lucia, "Galería Municipal de Arte", "Pedro Ugarte León", "CONV-2026-010", "POL-90233", 8000.0, 70, 50, 48, "regular", "regular"),
    pr(5, 17, U.lucia, "Casa de la Cultura Municipal", "Elena Cárdenas Ruiz", "CONV-2026-018", "POL-93105", 6500.0, 3, -25, null, "regular"),
  ];

  /* Inventarios */
  const I = { teatro: uuid(TIPO.inventario, 1), pinacoteca: uuid(TIPO.inventario, 2), quinones: uuid(TIPO.inventario, 3) };
  const inventarios: Inventario[] = [
    { id: I.teatro, museoId: M.teatro, usuarioId: U.gabriela, usuarioCierreId: U.marco, fechaInicio: hace(5, 9), fechaCierre: hace(5, 12), estado: "cerrado" },
    { id: I.pinacoteca, museoId: M.pinacoteca, usuarioId: U.miguel, usuarioCierreId: U.miguel, fechaInicio: hace(12, 9), fechaCierre: hace(12, 12), estado: "cerrado" },
    { id: I.quinones, museoId: M.quinones, usuarioId: U.lucia, fechaInicio: hace(1, 9), estado: "en_curso" },
  ];

  let nDetalle = 0;
  const d = (inventarioId: string, piezaN: number, resultado: ResultadoInventario, observacion?: string): DetalleInventario => ({
    id: uuid(TIPO.detalle, ++nDetalle),
    inventarioId,
    piezaId: P(piezaN),
    resultado,
    observacion,
  });
  const detallesInventario: DetalleInventario[] = [
    // Inventario 1 (Teatro): esperadas = piezas del museo menos la del préstamo 1 (pieza 6)
    d(I.teatro, 1, "encontrada"),
    d(I.teatro, 2, "encontrada"),
    d(I.teatro, 3, "encontrada"),
    d(I.teatro, 4, "encontrada"),
    d(I.teatro, 5, "encontrada"),
    d(I.teatro, 13, "con_dano", "Fisura en la base"),
    d(I.teatro, 14, "no_encontrada", "No se ubicó en su vitrina"),
    // Inventario 2 (Pinacoteca): esperadas = piezas del museo menos la del préstamo 2 (pieza 10)
    d(I.pinacoteca, 7, "encontrada"),
    d(I.pinacoteca, 8, "encontrada"),
    d(I.pinacoteca, 9, "encontrada"),
    d(I.pinacoteca, 11, "encontrada"),
    d(I.pinacoteca, 12, "encontrada"),
    // Inventario 3 (Casa Quiñones, en curso): solo las piezas ya marcadas
    d(I.quinones, 15, "encontrada"),
    d(I.quinones, 16, "encontrada"),
    d(I.quinones, 19, "con_dano", "Lomo desprendido"),
  ];

  /* Historial */
  let nHistorial = 0;
  const h = (
    dias: number,
    hora: number,
    piezaN: number,
    usuarioId: string,
    campoModificado: string,
    valorAnterior: string,
    valorNuevo: string,
  ): HistorialCambio => ({
    id: uuid(TIPO.historial, ++nHistorial),
    piezaId: P(piezaN),
    usuarioId,
    campoModificado,
    valorAnterior,
    valorNuevo,
    fecha: hace(dias, hora),
  });
  const ESTADO = "estado de conservación";
  const historial: HistorialCambio[] = [
    // Existentes: pieza 2 (Teatro) y pieza 9 (Pinacoteca)
    h(120, 10, 2, U.marco, ESTADO, "malo", "bueno"),
    h(70, 11, 2, U.gabriela, ESTADO, "bueno", "malo"),
    h(25, 12, 2, U.brandon, ESTADO, "malo", "regular"),
    h(110, 10, 9, U.miguel, ESTADO, "regular", "bueno"),
    h(60, 11, 9, U.gabriela, ESTADO, "bueno", "regular"),
    h(15, 12, 9, U.brandon, ESTADO, "regular", "malo"),
    // Adicionales
    h(90, 10, 5, U.marco, "disponibilidad", "disponible", "en_prestamo"),
    h(70, 10, 17, U.lucia, "disponibilidad", "disponible", "en_prestamo"),
    h(60, 10, 10, U.miguel, "disponibilidad", "disponible", "en_prestamo"),
    h(48, 10, 17, U.lucia, "disponibilidad", "en_prestamo", "disponible"),
    h(30, 10, 5, U.marco, "disponibilidad", "en_prestamo", "disponible"),
    h(30, 11, 5, U.marco, ESTADO, "bueno", "regular"),
    h(20, 10, 1, U.gabriela, "ubicación física", "Depósito A, Estante 1", "Sala 1, Vitrina 1"),
    h(10, 10, 6, U.gabriela, "disponibilidad", "disponible", "en_prestamo"),
    h(8, 10, 15, U.lucia, "ubicación física", "Almacén", "Sala principal, vitrina 1"),
    h(5, 12, 13, U.gabriela, ESTADO, "regular", "malo"),
    h(5, 12, 14, U.gabriela, "disponibilidad", "disponible", "pendiente_verificacion"),
    h(3, 10, 17, U.lucia, "disponibilidad", "disponible", "en_prestamo"),
  ];

  return {
    organizaciones,
    museos,
    usuarios,
    categorias,
    piezas,
    historial,
    exposiciones,
    prestamos,
    inventarios,
    detallesInventario,
  };
}
