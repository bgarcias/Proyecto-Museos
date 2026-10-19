import CI_Menu_Usuarios from "@/components/CI_Menu_Usuarios/CI_Menu_Usuarios";
import { listarUsuarios } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  const usuarios = await listarUsuarios();
  return <CI_Menu_Usuarios usuarios={usuarios} />;
}
