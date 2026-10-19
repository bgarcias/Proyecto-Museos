import { notFound } from "next/navigation";
import CI_Formulario_Museo from "@/components/CI_Formulario_Museo/CI_Formulario_Museo";
import { cargarFormularioMuseo } from "@/lib/controllers/CC_Museo";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await cargarFormularioMuseo(id);
  if (!datos) notFound();
  return <CI_Formulario_Museo museo={datos.museo} />;
}
