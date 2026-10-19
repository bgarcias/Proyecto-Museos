import { LIMITE_ANIOS_FECHAS, ZONA_HORARIA } from "./constantes";
import type { EstadoExposicion, Exposicion, Prestamo, SituacionPrestamo } from "./tipos";

/*
 * Fechas del sistema, siempre en la zona de `ZONA_HORARIA` (America/Lima) de forma explícita. Una marca de tiempo
 * (ISO con hora, en UTC) se convierte a esa zona para sacar su día y su hora. Una fecha de solo día (AAAA-MM-DD)
 * se trata como texto: nunca se convierte ni se desplaza.
 */

const FORMATO_PARTES = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type Partes = { y: number; m: number; d: number; hh: number; mm: number };

/** Año, mes, día, hora y minuto de un instante, en la zona del sistema. */
function partesDeInstante(fecha: Date): Partes {
  const partes: Record<string, number> = {};
  for (const p of FORMATO_PARTES.formatToParts(fecha)) if (p.type !== "literal") partes[p.type] = Number(p.value);
  return { y: partes.year, m: partes.month, d: partes.day, hh: partes.hour, mm: partes.minute };
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** Día (AAAA-MM-DD) de un instante, en la zona del sistema. Es el único criterio de día de todo el sistema. */
export function aISO(fecha: Date): string {
  const p = partesDeInstante(fecha);
  return `${p.y}-${dosDigitos(p.m)}-${dosDigitos(p.d)}`;
}

/** Fecha de hoy en formato ISO, solo día, en la zona del sistema. */
export function hoyISO(): string {
  return aISO(new Date());
}

/** Día (AAAA-MM-DD) de una marca de tiempo ISO, en la zona del sistema. */
export function diaLocal(iso: string): string {
  return aISO(new Date(iso));
}

/** Instante UTC (ISO) de una hora de reloj de la zona del sistema en un día dado. Sirve para la semilla. */
export function instanteDeLima(dia: string, hora: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const supuesto = Date.UTC(y, m - 1, d, hora);
  const p = partesDeInstante(new Date(supuesto));
  const comoUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm);
  return new Date(supuesto - (comoUtc - supuesto)).toISOString();
}

/** Suma días a una fecha de solo día, sin conversión de zona. */
export function sumarDias(dia: string, dias: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + dias));
  return `${f.getUTCFullYear()}-${dosDigitos(f.getUTCMonth() + 1)}-${dosDigitos(f.getUTCDate())}`;
}

/** Día siguiente a una fecha ISO de solo día. Sirve para pasar un extremo inclusivo a uno exclusivo. */
export function diaSiguiente(dia: string): string {
  return sumarDias(dia, 1);
}

/** Suma días a la fecha de hoy y devuelve la fecha ISO. */
export function diasDesdeHoy(dias: number): string {
  return sumarDias(hoyISO(), dias);
}

/** Última fecha permitida para las fechas de exposiciones y de devolución de préstamos: hoy más el límite de años, en formato ISO, solo día. */
export function fechaLimite(): string {
  const [y, m, d] = hoyISO().split("-").map(Number);
  const f = new Date(Date.UTC(y + LIMITE_ANIOS_FECHAS, m - 1, d));
  return `${f.getUTCFullYear()}-${dosDigitos(f.getUTCMonth() + 1)}-${dosDigitos(f.getUTCDate())}`;
}

/**
 * Estado de una exposición: cancelada si está marcada; si no, por fechas con fin exclusivo.
 * Programada: inicio > hoy. Vigente: inicio <= hoy < fin. Finalizada: fin <= hoy.
 */
export function estadoExposicion(
  e: Pick<Exposicion, "fechaInicio" | "fechaFin" | "cancelada">,
  hoy: string = hoyISO(),
): EstadoExposicion {
  if (e.cancelada) return "cancelada";
  if (e.fechaFin <= hoy) return "finalizada";
  if (e.fechaInicio > hoy) return "programada";
  return "vigente";
}

/**
 * Situación de un préstamo (se calcula, no se guarda): Devuelto con fecha real; Vencido sin ella
 * y con prevista anterior a hoy; En préstamo en los demás casos.
 */
export function situacionPrestamo(
  p: Pick<Prestamo, "fechaDevolucionReal" | "fechaDevolucionPrevista">,
  hoy: string = hoyISO(),
): SituacionPrestamo {
  if (p.fechaDevolucionReal) return "devuelto";
  if (p.fechaDevolucionPrevista < hoy) return "vencido";
  return "en_prestamo";
}

/** Dos rangos se cruzan si el inicio de cada uno es anterior al fin del otro. Sirve para exposiciones y préstamos. */
export function rangosSeCruzan(a: { inicio: string; fin: string }, b: { inicio: string; fin: string }): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/** Rango de una exposición, para usar con rangosSeCruzan. */
export function rangoExposicion(e: Pick<Exposicion, "fechaInicio" | "fechaFin">) {
  return { inicio: e.fechaInicio, fin: e.fechaFin };
}

/**
 * Fecha como DD/MM/AAAA. El día suelto se formatea como texto; una marca con hora se convierte
 * antes a su día en la zona del sistema.
 */
export function formatearFecha(iso?: string): string {
  if (!iso) return "-";
  const dia = iso.length > 10 ? diaLocal(iso) : iso;
  const [y, m, d] = dia.split("-");
  return `${d}/${m}/${y}`;
}

/** Fecha y hora de una marca de tiempo como DD/MM/AAAA HH:MM, en la zona del sistema. */
export function formatearFechaHora(iso: string): string {
  const p = partesDeInstante(new Date(iso));
  return `${dosDigitos(p.d)}/${dosDigitos(p.m)}/${p.y} ${dosDigitos(p.hh)}:${dosDigitos(p.mm)}`;
}
