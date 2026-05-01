import { redirect } from "next/navigation";

export default async function SalesByClientPage() {
  redirect("/dashboard?tab=ventas-clientes");
}
