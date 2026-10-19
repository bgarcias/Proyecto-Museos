import { notFound } from "next/navigation";
import CI_Formulario_Exposicion from "@/components/CI_Formulario_Exposicion/CI_Formulario_Exposicion";
import { cargarFormularioExposicion } from "@/lib/controllers/CC_Exposicion";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await cargarFormularioExposicion(id);
  if (!datos) notFound();
  return (
    <CI_Formulario_Exposicion
      exposicion={datos.exposicion}
      piezasActuales={datos.piezas}
      museos={datos.museos}
      categorias={datos.categorias}
      limite={datos.limite}
    />
  );
}
