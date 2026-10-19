import CI_Catalogo_Piezas from "@/components/CI_Catalogo_Piezas/CI_Catalogo_Piezas";
import { cargarCatalogo } from "@/lib/controllers/CC_Pieza";

export default async function Page() {
  const { piezas, museos, categorias } = await cargarCatalogo();
  return <CI_Catalogo_Piezas piezas={piezas} museos={museos} categorias={categorias} />;
}
