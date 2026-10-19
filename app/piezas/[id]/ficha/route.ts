import { generarFichaTecnica } from "@/lib/controllers/CC_Pieza";
import { respuestaPdf } from "@/lib/respuestaPdf";

/** Ficha técnica de una pieza en PDF. Requiere sesión y acceso al museo de la pieza. */
export async function GET(_solicitud: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await generarFichaTecnica(id);
  if (!ficha) return new Response("No se encontró la pieza", { status: 404 });
  return respuestaPdf(ficha.contenido, ficha.nombreArchivo);
}
