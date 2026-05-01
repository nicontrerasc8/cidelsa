import { redirect } from "next/navigation";

export default async function SellerClientsPage() {
  redirect("/dashboard?tab=vendedor-clientes");
}
