import { redirect } from "next/navigation";

export default async function PresupuestosPage() {
  redirect("/dashboard?tab=presupuestos");
}
