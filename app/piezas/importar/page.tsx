import CI_Importar_Piezas from "@/components/CI_Importar_Piezas/CI_Importar_Piezas";
import { cargarImportacion } from "@/lib/controllers/CC_Importacion";

export default async function Page() {
  const { museos } = await cargarImportacion();
  return <CI_Importar_Piezas museos={museos} />;
}
