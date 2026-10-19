import { notFound } from "next/navigation";
import CI_Formulario_Museo from "@/components/CI_Formulario_Museo/CI_Formulario_Museo";
import { cargarFormularioMuseo } from "@/lib/controllers/CC_Museo";

export default async function Page() {
  const datos = await cargarFormularioMuseo();
  if (!datos) notFound();
  return <CI_Formulario_Museo museo={null} />;
}
