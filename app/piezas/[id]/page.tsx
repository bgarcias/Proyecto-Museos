import CI_Detalle_Pieza from "@/components/CI_Detalle_Pieza/CI_Detalle_Pieza";
import { cargarDetallePieza } from "@/lib/controllers/CC_Pieza";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pieza = await cargarDetallePieza(id);
  return <CI_Detalle_Pieza pieza={pieza} />;
}
