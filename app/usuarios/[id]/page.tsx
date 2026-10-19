import { notFound } from "next/navigation";
import CI_Formulario_Usuario from "@/components/CI_Formulario_Usuario/CI_Formulario_Usuario";
import { cargarFormularioUsuario } from "@/lib/controllers/CC_Usuario";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await cargarFormularioUsuario(id);
  if (!datos) notFound();
  return <CI_Formulario_Usuario usuario={datos.usuario} museos={datos.museos} esCuentaPropia={datos.esCuentaPropia} />;
}
