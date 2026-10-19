import { notFound } from "next/navigation";
import CI_Formulario_Usuario from "@/components/CI_Formulario_Usuario/CI_Formulario_Usuario";
import { cargarFormularioUsuario } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  const datos = await cargarFormularioUsuario();
  if (!datos) notFound();
  return <CI_Formulario_Usuario usuario={null} museos={datos.museos} esCuentaPropia={false} />;
}
