import { redirect } from "next/navigation";

export default async function BillingByLinePage() {
  redirect("/dashboard?tab=facturacion-linea");
}
