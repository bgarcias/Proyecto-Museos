import CI_Inicio from "@/components/CI_Inicio/CI_Inicio";
import { cargarInicio } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  const usuario = await cargarInicio();
  return <CI_Inicio usuario={usuario} />;
}
