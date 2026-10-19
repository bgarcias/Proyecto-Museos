import { notFound } from "next/navigation";
import CI_Realizar_Inventario from "@/components/CI_Realizar_Inventario/CI_Realizar_Inventario";
import { cargarInventario } from "@/lib/controllers/CC_Inventario";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const datos = await cargarInventario(id);
  if (!datos) notFound();
  // La clave reinicia el estado del conteo al pasar de en curso a cerrado
  return (
    <CI_Realizar_Inventario
      key={datos.inventario.estado}
      inventario={datos.inventario}
      filas={datos.filas}
      resumen={datos.resumen}
    />
  );
}
