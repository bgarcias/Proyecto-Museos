import { notFound } from "next/navigation";
import CI_Formulario_Exposicion from "@/components/CI_Formulario_Exposicion/CI_Formulario_Exposicion";
import { cargarFormularioExposicion } from "@/lib/controllers/CC_Exposicion";

export default async function Page() {
  const datos = await cargarFormularioExposicion();
  if (!datos) notFound();
  return <CI_Formulario_Exposicion exposicion={null} piezasActuales={[]} museos={datos.museos} categorias={datos.categorias} limite={datos.limite} />;
}
