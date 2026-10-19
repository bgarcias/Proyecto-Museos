import CI_Menu_Inventarios from "@/components/CI_Menu_Inventarios/CI_Menu_Inventarios";
import { cargarInventarios } from "@/lib/controllers/CC_Inventario";

export default async function Page() {
  const { inventarios, museos } = await cargarInventarios();
  return <CI_Menu_Inventarios inventarios={inventarios} museos={museos} />;
}
