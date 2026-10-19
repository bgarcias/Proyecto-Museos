import CI_Reporte_Prestamos from "@/components/CI_Reporte_Prestamos/CI_Reporte_Prestamos";
import { cargarReportePrestamos } from "@/lib/controllers/CC_Reporte";

export default async function Page() {
  const { museos } = await cargarReportePrestamos();
  return <CI_Reporte_Prestamos museos={museos} />;
}
