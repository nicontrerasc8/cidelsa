import { redirect } from "next/navigation";

export default async function ContabilidadPage() {
  redirect("/dashboard?tab=contabilidad");
}
