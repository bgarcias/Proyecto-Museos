import type { Museo, UsuarioPublico } from "./tipos";

/**
 * Acceso a un museo. Siempre dentro de la organización de la persona.
 * El administrador accede a todos los museos de su organización. El colaborador, solo a los asignados.
 */
export function puedeAccederMuseo(usuario: UsuarioPublico, museo: Pick<Museo, "id" | "organizacionId">): boolean {
  if (museo.organizacionId !== usuario.organizacionId) return false;
  return usuario.rol === "administrador" || usuario.museoIds.includes(museo.id);
}
