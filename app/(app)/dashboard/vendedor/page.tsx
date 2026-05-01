import { redirect } from "next/navigation";

export default async function SellerDashboardPage() {
  redirect("/dashboard?tab=vendedor-resumen");
}
