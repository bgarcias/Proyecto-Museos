import CI_Menu_Prestamos from "@/components/CI_Menu_Prestamos/CI_Menu_Prestamos";
import { cargarPrestamos } from "@/lib/controllers/CC_Prestamo";

export default async function Page() {
  const prestamos = await cargarPrestamos();
  return <CI_Menu_Prestamos prestamos={prestamos} />;
}
