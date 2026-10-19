import CI_Restablecer_Contrasena from "@/components/CI_Restablecer_Contrasena/CI_Restablecer_Contrasena";
import { cargarRestablecimiento } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  await cargarRestablecimiento();
  return <CI_Restablecer_Contrasena />;
}
