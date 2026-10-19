import CI_Recuperar_Contrasena from "@/components/CI_Recuperar_Contrasena/CI_Recuperar_Contrasena";
import { cargarRecuperacion } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  await cargarRecuperacion();
  return <CI_Recuperar_Contrasena />;
}
