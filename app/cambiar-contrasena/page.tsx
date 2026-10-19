import CI_Cambiar_Contrasena from "@/components/CI_Cambiar_Contrasena/CI_Cambiar_Contrasena";
import { cargarCambioContrasena } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  const usuario = await cargarCambioContrasena();
  return <CI_Cambiar_Contrasena nombre={usuario.nombre} />;
}
