import CI_Formulario_Prestamo from "@/components/CI_Formulario_Prestamo/CI_Formulario_Prestamo";
import { cargarFormularioPrestamo } from "@/lib/controllers/CC_Prestamo";

export default async function Page() {
  const { museos, categorias, hoy, limite } = await cargarFormularioPrestamo();
  return <CI_Formulario_Prestamo museos={museos} categorias={categorias} hoy={hoy} limite={limite} />;
}
