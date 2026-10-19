import CI_Devolucion_Prestamo from "@/components/CI_Devolucion_Prestamo/CI_Devolucion_Prestamo";
import { cargarDevolucion } from "@/lib/controllers/CC_Prestamo";

export default async function Page() {
  const prestamos = await cargarDevolucion();
  return <CI_Devolucion_Prestamo prestamos={prestamos} />;
}
