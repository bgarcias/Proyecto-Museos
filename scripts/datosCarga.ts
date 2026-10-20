// Datos de la carga inicial, separados de la lógica (scripts/cargaInicial.ts).
// Todo se referencia por claves de texto: los ids, los prefijos, los códigos y las fechas los calcula el script.
// Los días son relativos al día de la carga, en hora de Lima. Los correos y la contraseña no van aquí.

import { CUENTAS_DEMO, MUSEO_AMANO, MUSEO_ANDRES, MUSEO_PINACOTECA, MUSEO_TEATRO } from "../lib/datosDemo";
import type { Disponibilidad, EstadoConservacion, ResultadoInventario, Rol, TipoColeccion } from "../lib/tipos";

export const NOMBRE_ORGANIZACION = "Organización de demostración";

export const CATEGORIAS = ["Arqueológico", "Pintura", "Escultura", "Cerámica", "Textil", "Orfebrería", "Documento", "Otro"];

export type DatoMuseo = { clave: string; nombre: string; tipo: TipoColeccion };
export const MUSEOS: DatoMuseo[] = [
  { clave: "teatro", nombre: MUSEO_TEATRO, tipo: "otro" },
  { clave: "pinacoteca", nombre: MUSEO_PINACOTECA, tipo: "arte" },
  { clave: "amano", nombre: MUSEO_AMANO, tipo: "arqueologia" },
  { clave: "andres", nombre: MUSEO_ANDRES, tipo: "ciencias_naturales" },
];

/* Las cuentas viven en lib/datosDemo.ts. Aquí se pasan los museos de nombre a clave */
export type DatoUsuario = { clave: string; nombre: string; rol: Rol; museos: string[]; correo?: string };
const claveDeMuseo = (nombre: string): string => {
  const museo = MUSEOS.find((m) => m.nombre === nombre);
  if (!museo) throw new Error(`Museo desconocido en las cuentas: ${nombre}`);
  return museo.clave;
};
export const USUARIOS: DatoUsuario[] = CUENTAS_DEMO.map((c) => ({
  clave: c.clave,
  nombre: c.nombre,
  rol: c.rol,
  museos: c.museos.map(claveDeMuseo),
  correo: c.correo,
}));

export type DatoPieza = {
  clave: string;
  museo: string;
  nombre: string;
  categoria: string;
  estado: EstadoConservacion;
  disponibilidad: Disponibilidad;
  ubicacion: string;
  registroHace: number;
  anio?: number;
  material?: string;
  descripcion?: string;
  codigoAnterior?: string;
};
/* El número del código sale del orden de cada museo en esta lista */
export const PIEZAS: DatoPieza[] = [
  { clave: "T1", museo: "teatro", nombre: "Litografía de la tapada limeña", categoria: "Pintura", estado: "bueno", disponibilidad: "disponible", ubicacion: "Sala 1, Vitrina 1", registroHace: 200, anio: 1950, material: "Litografía sobre papel", descripcion: "Litografía que representa a una tapada limeña con saya y manto. Pieza de demostración." },
  { clave: "T2", museo: "teatro", nombre: "Vestido de marinera limeña de escenario", categoria: "Textil", estado: "regular", disponibilidad: "disponible", ubicacion: "Sala 2, Maniquí 3", registroHace: 170, anio: 1930, material: "Algodón y encaje", descripcion: "Vestido de escenario para bailar marinera, con vuelo y encaje. Pieza de demostración." },
  { clave: "T3", museo: "teatro", nombre: "Libreto manuscrito de sainete criollo", categoria: "Documento", estado: "malo", disponibilidad: "disponible", ubicacion: "Depósito A, Estante 2", registroHace: 140, anio: 1920, material: "Papel y tinta", descripcion: "Libreto de un sainete criollo, anotado a mano. Pieza de demostración." },
  { clave: "T4", museo: "teatro", nombre: "Boceto de escenografía de un callejón del Rímac", categoria: "Pintura", estado: "bueno", disponibilidad: "disponible", ubicacion: "Sala 2, Muro norte", registroHace: 110, anio: 1960, material: "Acuarela sobre papel", descripcion: "Boceto de decorado teatral de un callejón del Rímac. Pieza de demostración." },
  { clave: "T5", museo: "teatro", nombre: "Cántaro chichero de barro, de utilería", categoria: "Cerámica", estado: "regular", disponibilidad: "disponible", ubicacion: "Depósito A, Estante 4", registroHace: 220, anio: 1940, material: "Arcilla", descripcion: "Cántaro de barro para chicha, usado como utilería escénica. Pieza de demostración." },
  { clave: "T6", museo: "teatro", nombre: "Mascapaicha de utilería para drama incaico", categoria: "Orfebrería", estado: "bueno", disponibilidad: "en_prestamo", ubicacion: "Sala 1, Vitrina 3", registroHace: 40, anio: 1970, material: "Metal dorado", descripcion: "Mascapaicha de metal dorado para un drama incaico, de utilería. Pieza de demostración." },
  { clave: "T7", museo: "teatro", nombre: "Telón de ensayo con vista de la Plaza Mayor de Lima", categoria: "Pintura", estado: "malo", disponibilidad: "disponible", ubicacion: "Depósito A, Estante 5", registroHace: 250, anio: 1955, material: "Lona pintada", descripcion: "Telón pintado para ensayos, con una vista de la Plaza Mayor de Lima y una fisura en la base. Pieza de demostración." },
  { clave: "T8", museo: "teatro", nombre: "Afiche de temporada de teatro criollo", categoria: "Documento", estado: "bueno", disponibilidad: "pendiente_verificacion", ubicacion: "Depósito A, Estante 6", registroHace: 260, anio: 1962, material: "Papel impreso", descripcion: "Afiche impreso de una temporada de teatro criollo. Pieza de demostración." },

  { clave: "P1", museo: "pinacoteca", nombre: "Retrato de dama limeña con mantilla", categoria: "Pintura", estado: "regular", disponibilidad: "disponible", ubicacion: "Galería 1, Muro este", registroHace: 190, anio: 1880, material: "Óleo sobre lienzo", descripcion: "Retrato de una dama limeña con mantilla, sin atribución de autor. Pieza de demostración." },
  { clave: "P2", museo: "pinacoteca", nombre: "Marina de Chorrillos al atardecer", categoria: "Pintura", estado: "bueno", disponibilidad: "disponible", ubicacion: "Galería 1, Muro sur", registroHace: 150, anio: 1895, material: "Óleo sobre lienzo", descripcion: "Marina de la costa de Chorrillos al atardecer, sin atribución de autor. Pieza de demostración." },
  { clave: "P3", museo: "pinacoteca", nombre: "Busto de yeso de prócer de la Independencia", categoria: "Escultura", estado: "malo", disponibilidad: "disponible", ubicacion: "Galería 2, Pedestal 1", registroHace: 120, anio: 1910, material: "Yeso", descripcion: "Busto de yeso de un prócer genérico de la Independencia, con desgaste visible. Pieza de demostración." },
  { clave: "P4", museo: "pinacoteca", nombre: "Escena costumbrista limeña con aguador", categoria: "Pintura", estado: "regular", disponibilidad: "en_prestamo", ubicacion: "Depósito B, Bastidor 1", registroHace: 90, anio: 1870, material: "Óleo sobre lienzo", descripcion: "Escena de costumbres en una plaza de Lima con un aguador, sin atribución de autor. Pieza de demostración." },
  { clave: "P5", museo: "pinacoteca", nombre: "Marco tallado de estilo virreinal", categoria: "Otro", estado: "bueno", disponibilidad: "disponible", ubicacion: "Depósito B, Estante 2", registroHace: 50, anio: 1900, material: "Madera tallada", descripcion: "Marco de madera tallada de estilo virreinal. Pieza de demostración." },
  { clave: "P6", museo: "pinacoteca", nombre: "Tapiz de lana con motivos andinos", categoria: "Textil", estado: "malo", disponibilidad: "disponible", ubicacion: "Depósito B, Estante 5", registroHace: 25, anio: 1925, material: "Lana", descripcion: "Tapiz de lana con motivos andinos y deterioro visible. Pieza de demostración." },

  { clave: "A1", museo: "amano", nombre: "Tejido Chancay con diseño de aves", categoria: "Textil", estado: "bueno", disponibilidad: "disponible", ubicacion: "Sala 1, vitrina 1", registroHace: 160, anio: 1350, material: "Algodón tejido", descripcion: "Tejido de algodón con una franja de aves esquemáticas.", codigoAnterior: "INV-1987-0412" },
  { clave: "A2", museo: "amano", nombre: "Fragmento de gasa Chancay", categoria: "Textil", estado: "bueno", disponibilidad: "disponible", ubicacion: "Sala 1, repisa 2", registroHace: 160, anio: 1300, material: "Algodón de trama abierta", descripcion: "Fragmento de tela liviana de trama abierta.", codigoAnterior: "INV-1987-0418" },
  { clave: "A3", museo: "amano", nombre: "Manto Paracas con figuras bordadas", categoria: "Textil", estado: "regular", disponibilidad: "en_prestamo", ubicacion: "Galería alta", registroHace: 150, anio: -100, material: "Algodón con lana de camélido", descripcion: "Manto con figuras bordadas en colores, de borde irregular." },
  { clave: "A4", museo: "amano", nombre: "Figura cuchimilco en cerámica chancay", categoria: "Cerámica", estado: "bueno", disponibilidad: "disponible", ubicacion: "Sala 2, vitrina 3", registroHace: 150, anio: 1350, material: "Cerámica", descripcion: "Figura humana esquemática de brazos extendidos." },
  { clave: "A5", museo: "amano", nombre: "Huso con torteras de hilado", categoria: "Arqueológico", estado: "malo", disponibilidad: "disponible", ubicacion: "Depósito, estante B", registroHace: 150, anio: 1200, material: "Madera y cerámica", descripcion: "Huso de madera con dos torteras de cerámica.", codigoAnterior: "INV-1991-0107" },

  { clave: "C1", museo: "andres", nombre: "Muestra de rodocrosita", categoria: "Otro", estado: "bueno", disponibilidad: "disponible", ubicacion: "Vitrina de minerales 1", registroHace: 100, material: "Mineral", descripcion: "Muestra de mineral rosado con bandas concéntricas." },
  { clave: "C2", museo: "andres", nombre: "Perro sin pelo en cerámica chancay", categoria: "Cerámica", estado: "regular", disponibilidad: "disponible", ubicacion: "Vitrina de cerámica 2", registroHace: 100, anio: 1350, material: "Cerámica", descripcion: "Figura de perro de cuerpo liso, en cerámica." },
];

export type DatoExposicion = {
  clave: string;
  museo: string;
  nombre: string;
  descripcion: string;
  inicioEnDias: number;
  finEnDias: number;
  cancelada: boolean;
  piezas: string[];
};
export const EXPOSICIONES: DatoExposicion[] = [
  { clave: "E1", museo: "teatro", nombre: "Lima en escena: tapadas y marineras", descripcion: "Muestra vigente de piezas del teatro limeño: una máscara, un vestido y un libreto.", inicioEnDias: -30, finEnDias: 30, cancelada: false, piezas: ["T1", "T2", "T3"] },
  { clave: "E2", museo: "teatro", nombre: "Callejones y chicherías de Lima", descripcion: "Exposición programada que coincide en fechas con la vigente, con un boceto y un cántaro de utilería.", inicioEnDias: 10, finEnDias: 60, cancelada: false, piezas: ["T4", "T5"] },
  { clave: "E3", museo: "pinacoteca", nombre: "Damas y marinas de Lima", descripcion: "Exposición temporal ya concluida.", inicioEnDias: -90, finEnDias: -30, cancelada: false, piezas: ["P1", "P2"] },
  { clave: "E4", museo: "amano", nombre: "Tejidos y cerámica Chancay", descripcion: "Piezas textiles y de cerámica de la cultura Chancay.", inicioEnDias: 15, finEnDias: 45, cancelada: false, piezas: ["A1", "A2", "A4"] },
  { clave: "E5", museo: "pinacoteca", nombre: "Próceres de la Independencia en yeso y madera", descripcion: "Exposición cancelada antes de su inicio.", inicioEnDias: 5, finEnDias: 25, cancelada: true, piezas: ["P3", "P5"] },
  { clave: "E6", museo: "pinacoteca", nombre: "Del virreinato a la República: talla y escultura", descripcion: "Exposición programada de la Pinacoteca, con un busto y un marco de estilo virreinal.", inicioEnDias: 10, finEnDias: 40, cancelada: false, piezas: ["P3", "P5"] },
];

export type DatoPrestamo = {
  pieza: string;
  usuario: string;
  institucion: string;
  responsable: string;
  convenio: string;
  poliza: string;
  valor: number;
  salidaHace: number;
  previstaEnDias: number;
  realHace?: number;
  estadoSalida: EstadoConservacion;
  estadoDevolucion?: EstadoConservacion;
};
export const PRESTAMOS: DatoPrestamo[] = [
  { pieza: "T6", usuario: "gabriela", institucion: "Centro Cultural Ficticio del Norte", responsable: "Responsable receptor 1", convenio: "CONV-PRUEBA-001", poliza: "POL-PRUEBA-001", valor: 1000, salidaHace: 10, previstaEnDias: 20, estadoSalida: "bueno" },
  { pieza: "P4", usuario: "miguel", institucion: "Biblioteca Ficticia del Sur", responsable: "Responsable receptor 2", convenio: "CONV-PRUEBA-002", poliza: "POL-PRUEBA-002", valor: 2000, salidaHace: 60, previstaEnDias: -15, estadoSalida: "regular" },
  { pieza: "T5", usuario: "marco", institucion: "Instituto Ficticio de Artes Escénicas", responsable: "Responsable receptor 3", convenio: "CONV-PRUEBA-003", poliza: "POL-PRUEBA-003", valor: 500, salidaHace: 90, previstaEnDias: -40, realHace: 30, estadoSalida: "bueno", estadoDevolucion: "regular" },
  { pieza: "A3", usuario: "miguel", institucion: "Galería Ficticia de Arte", responsable: "Responsable receptor 4", convenio: "CONV-PRUEBA-004", poliza: "POL-PRUEBA-004", valor: 3000, salidaHace: 70, previstaEnDias: -50, realHace: 48, estadoSalida: "regular", estadoDevolucion: "regular" },
  { pieza: "A3", usuario: "miguel", institucion: "Casa de la Cultura Ficticia", responsable: "Responsable receptor 5", convenio: "CONV-PRUEBA-005", poliza: "POL-PRUEBA-005", valor: 1500, salidaHace: 3, previstaEnDias: 25, estadoSalida: "regular" },
];

export type DatoInventario = {
  clave: string;
  museo: string;
  inicia: string;
  cierra?: string;
  inicioHace: number;
  inicioHora: number;
  cierreHace?: number;
  cierreHora?: number;
  estado: "en_curso" | "cerrado";
};
export const INVENTARIOS: DatoInventario[] = [
  { clave: "I1", museo: "teatro", inicia: "gabriela", cierra: "marco", inicioHace: 5, inicioHora: 9, cierreHace: 5, cierreHora: 12, estado: "cerrado" },
  { clave: "I2", museo: "pinacoteca", inicia: "miguel", cierra: "miguel", inicioHace: 12, inicioHora: 9, cierreHace: 12, cierreHora: 12, estado: "cerrado" },
  { clave: "I3", museo: "amano", inicia: "miguel", inicioHace: 1, inicioHora: 9, estado: "en_curso" },
];

export type DatoDetalle = { inventario: string; pieza: string; resultado: ResultadoInventario; observacion?: string };
export const DETALLES: DatoDetalle[] = [
  /* I1 (Teatro): esperadas son las del museo menos la del préstamo abierto (T6) */
  { inventario: "I1", pieza: "T1", resultado: "encontrada" },
  { inventario: "I1", pieza: "T2", resultado: "encontrada" },
  { inventario: "I1", pieza: "T3", resultado: "encontrada" },
  { inventario: "I1", pieza: "T4", resultado: "encontrada" },
  { inventario: "I1", pieza: "T5", resultado: "encontrada" },
  { inventario: "I1", pieza: "T7", resultado: "con_dano", observacion: "Fisura en la base" },
  { inventario: "I1", pieza: "T8", resultado: "no_encontrada", observacion: "No se ubicó en su vitrina" },
  /* I2 (Pinacoteca): esperadas son las del museo menos la del préstamo vencido (P4) */
  { inventario: "I2", pieza: "P1", resultado: "encontrada" },
  { inventario: "I2", pieza: "P2", resultado: "encontrada" },
  { inventario: "I2", pieza: "P3", resultado: "encontrada" },
  { inventario: "I2", pieza: "P5", resultado: "encontrada" },
  { inventario: "I2", pieza: "P6", resultado: "encontrada" },
  /* I3 (Amano, en curso): solo las ya marcadas. Falta A4 y A3 está en préstamo */
  { inventario: "I3", pieza: "A1", resultado: "encontrada" },
  { inventario: "I3", pieza: "A2", resultado: "encontrada" },
  { inventario: "I3", pieza: "A5", resultado: "con_dano", observacion: "Madera astillada en un extremo" },
];

export type DatoCambio = { hace: number; hora: number; pieza: string; usuario: string; campo: string; anterior: string; nuevo: string };
const ESTADO = "estado de conservación";
const DISP = "disponibilidad";
export const HISTORIAL: DatoCambio[] = [
  { hace: 120, hora: 10, pieza: "T2", usuario: "marco", campo: ESTADO, anterior: "malo", nuevo: "bueno" },
  { hace: 70, hora: 11, pieza: "T2", usuario: "gabriela", campo: ESTADO, anterior: "bueno", nuevo: "malo" },
  { hace: 25, hora: 12, pieza: "T2", usuario: "admin", campo: ESTADO, anterior: "malo", nuevo: "regular" },
  { hace: 110, hora: 10, pieza: "P3", usuario: "miguel", campo: ESTADO, anterior: "regular", nuevo: "bueno" },
  { hace: 60, hora: 11, pieza: "P3", usuario: "gabriela", campo: ESTADO, anterior: "bueno", nuevo: "regular" },
  { hace: 15, hora: 12, pieza: "P3", usuario: "admin", campo: ESTADO, anterior: "regular", nuevo: "malo" },
  { hace: 90, hora: 10, pieza: "T5", usuario: "marco", campo: DISP, anterior: "disponible", nuevo: "en_prestamo" },
  { hace: 70, hora: 10, pieza: "A3", usuario: "miguel", campo: DISP, anterior: "disponible", nuevo: "en_prestamo" },
  { hace: 60, hora: 10, pieza: "P4", usuario: "miguel", campo: DISP, anterior: "disponible", nuevo: "en_prestamo" },
  { hace: 48, hora: 10, pieza: "A3", usuario: "miguel", campo: DISP, anterior: "en_prestamo", nuevo: "disponible" },
  { hace: 30, hora: 10, pieza: "T5", usuario: "marco", campo: DISP, anterior: "en_prestamo", nuevo: "disponible" },
  { hace: 30, hora: 11, pieza: "T5", usuario: "marco", campo: ESTADO, anterior: "bueno", nuevo: "regular" },
  { hace: 20, hora: 10, pieza: "T1", usuario: "gabriela", campo: "ubicación física", anterior: "Depósito A, Estante 1", nuevo: "Sala 1, Vitrina 1" },
  { hace: 10, hora: 10, pieza: "T6", usuario: "gabriela", campo: DISP, anterior: "disponible", nuevo: "en_prestamo" },
  { hace: 8, hora: 10, pieza: "A1", usuario: "miguel", campo: "ubicación física", anterior: "Almacén", nuevo: "Sala 1, vitrina 1" },
  { hace: 5, hora: 12, pieza: "T7", usuario: "gabriela", campo: ESTADO, anterior: "regular", nuevo: "malo" },
  { hace: 5, hora: 12, pieza: "T8", usuario: "gabriela", campo: DISP, anterior: "disponible", nuevo: "pendiente_verificacion" },
  { hace: 3, hora: 10, pieza: "A3", usuario: "miguel", campo: DISP, anterior: "disponible", nuevo: "en_prestamo" },
];
