import CI_Menu_Reportes from "@/components/CI_Menu_Reportes/CI_Menu_Reportes";
import { cargarReporte } from "@/lib/controllers/CC_Reporte";

export default async function Page() {
  // Exige sesión, como el resto de las pantallas. El menú no necesita datos.
  await cargarReporte();
  return <CI_Menu_Reportes />;
}
