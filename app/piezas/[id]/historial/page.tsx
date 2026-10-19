import CI_Historial_Pieza from "@/components/CI_Historial_Pieza/CI_Historial_Pieza";
import { consultarHistorial } from "@/lib/controllers/CC_Historial";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { pieza, registros } = await consultarHistorial(id);
  return <CI_Historial_Pieza pieza={pieza} registros={registros} />;
}
