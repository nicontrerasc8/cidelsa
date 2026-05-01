import { redirect } from "next/navigation";

export default async function SellerBillingByLinePage() {
  redirect("/dashboard?tab=vendedor-facturacion-linea");
}
