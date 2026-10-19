import CI_Reporte_Piezas from "@/components/CI_Reporte_Piezas/CI_Reporte_Piezas";
import { cargarReportePiezas } from "@/lib/controllers/CC_Reporte";

export default async function Page() {
  const { museos } = await cargarReportePiezas();
  return <CI_Reporte_Piezas museos={museos} />;
}
