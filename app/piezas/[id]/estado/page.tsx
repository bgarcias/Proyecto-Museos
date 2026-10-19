import CI_Actualizar_Estado from "@/components/CI_Actualizar_Estado/CI_Actualizar_Estado";
import { cargarActualizarEstado } from "@/lib/controllers/CC_Pieza";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pieza = await cargarActualizarEstado(id);
  return <CI_Actualizar_Estado pieza={pieza} />;
}
