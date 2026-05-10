import { redirect } from "next/navigation";

export default async function EstadoComercialPage() {
  redirect("/dashboard?tab=estado-comercial");
}
