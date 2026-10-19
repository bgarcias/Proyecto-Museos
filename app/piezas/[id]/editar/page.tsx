import { notFound } from "next/navigation";
import CI_Formulario_Pieza from "@/components/CI_Formulario_Pieza/CI_Formulario_Pieza";
import { cargarFormularioPieza } from "@/lib/controllers/CC_Pieza";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await cargarFormularioPieza(id);
  if (!datos) notFound();
  return <CI_Formulario_Pieza pieza={datos.pieza} museos={datos.museos} categorias={datos.categorias} anioMaximo={datos.anioMaximo} />;
}
