import CI_Menu_Exposiciones from "@/components/CI_Menu_Exposiciones/CI_Menu_Exposiciones";
import { cargarExposiciones } from "@/lib/controllers/CC_Exposicion";

export default async function Page() {
  const { exposiciones, museos } = await cargarExposiciones();
  return <CI_Menu_Exposiciones exposiciones={exposiciones} museos={museos} />;
}
