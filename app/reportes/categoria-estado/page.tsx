import CI_Reporte_Categoria_Estado from "@/components/CI_Reporte_Categoria_Estado/CI_Reporte_Categoria_Estado";
import { cargarReporte } from "@/lib/controllers/CC_Reporte";

export default async function Page() {
  const { categorias } = await cargarReporte();
  return <CI_Reporte_Categoria_Estado categorias={categorias} />;
}
