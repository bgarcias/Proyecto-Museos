import { generarFichaTecnica } from "@/lib/controllers/CC_Pieza";
import { MENSAJE_PIEZA_NO_ENCONTRADA } from "@/lib/constantes";
import { respuestaPdf } from "@/lib/exportacion/respuestaPdf";

/** Ficha técnica en PDF. Requiere sesión y acceso al museo de la pieza. */
export async function GET(_solicitud: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await generarFichaTecnica(id);
  if (!ficha) return new Response(MENSAJE_PIEZA_NO_ENCONTRADA, { status: 404 });
  return respuestaPdf(ficha.contenido, ficha.nombreArchivo);
}
