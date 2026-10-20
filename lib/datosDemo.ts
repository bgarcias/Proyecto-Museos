// Fuente única de las seis cuentas de la carga inicial. La usan la carga (scripts/datosCarga.ts)
// y el recuadro de datos demo del login, así nunca se contradicen.

import type { Rol } from "./tipos";

export const MUSEO_TEATRO = "Museo Municipal de Teatro";
export const MUSEO_PINACOTECA = "Pinacoteca Municipal Ignacio Merino";
export const MUSEO_AMANO = "Museo Amano";
export const MUSEO_ANDRES = "Museo Andrés del Castillo";

/* Sin correo: el del administrador y el de Miguel vienen de CARGA_ADMIN_EMAIL y CARGA_COLABORADOR_EMAIL */
export type CuentaDemo = { clave: string; nombre: string; rol: Rol; activo: boolean; museos: string[]; correo?: string };

/** El administrador va primero. Los museos van por nombre. */
export const CUENTAS_DEMO: CuentaDemo[] = [
  { clave: "admin", nombre: "Brandon Garcia Sanchez", rol: "administrador", activo: true, museos: [MUSEO_TEATRO, MUSEO_PINACOTECA, MUSEO_AMANO, MUSEO_ANDRES] },
  { clave: "miguel", nombre: "Miguel Zambrano Meléndez", rol: "colaborador", activo: true, museos: [MUSEO_PINACOTECA, MUSEO_AMANO] },
  { clave: "gabriela", nombre: "Gabriela Linares Ortega", rol: "colaborador", activo: true, museos: [MUSEO_TEATRO, MUSEO_PINACOTECA], correo: "gabriela@vestigio.com" },
  { clave: "marco", nombre: "Marco Aguirre Soto", rol: "colaborador", activo: true, museos: [MUSEO_TEATRO], correo: "marco@vestigio.com" },
  { clave: "lucia", nombre: "Lucía Paredes Vargas", rol: "colaborador", activo: true, museos: [MUSEO_AMANO], correo: "lucia@vestigio.com" },
  { clave: "diego", nombre: "Diego Salazar Rojas", rol: "colaborador", activo: false, museos: [MUSEO_TEATRO], correo: "diego@vestigio.com" },
];

/** Museos que solo ve el administrador: los que ninguna otra cuenta tiene asignados. */
export function museosSoloAdministrador(): string[] {
  const otros = new Set(CUENTAS_DEMO.filter((c) => c.rol !== "administrador").flatMap((c) => c.museos));
  return CUENTAS_DEMO.filter((c) => c.rol === "administrador").flatMap((c) => c.museos.filter((m) => !otros.has(m)));
}
