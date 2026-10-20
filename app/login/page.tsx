import CI_Login from "@/components/CI_Login/CI_Login";
import { cargarLogin } from "@/lib/controllers/CC_Usuario";

export default async function Page() {
  const datosDemo = await cargarLogin();
  return <CI_Login datosDemo={datosDemo} />;
}
