import CI_Reporte_Exposiciones from "@/components/CI_Reporte_Exposiciones/CI_Reporte_Exposiciones";
import { cargarReporteExposiciones } from "@/lib/controllers/CC_Reporte";

export default async function Page() {
  const { museos } = await cargarReporteExposiciones();
  return <CI_Reporte_Exposiciones museos={museos} />;
}
