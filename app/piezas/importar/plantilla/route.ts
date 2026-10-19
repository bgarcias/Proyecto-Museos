import { generarPlantilla } from "@/lib/controllers/CC_Importacion";

/** Plantilla de Excel para importar. Requiere sesión. */
export async function GET() {
  const { nombreArchivo, contenido } = await generarPlantilla();
  return new Response(contenido as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
