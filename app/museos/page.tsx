import CI_Menu_Museos from "@/components/CI_Menu_Museos/CI_Menu_Museos";
import { listarMuseos } from "@/lib/controllers/CC_Museo";

export default async function Page() {
  const museos = await listarMuseos();
  return <CI_Menu_Museos museos={museos} />;
}
