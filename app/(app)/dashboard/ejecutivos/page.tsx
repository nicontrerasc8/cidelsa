import { redirect } from "next/navigation";

export default async function SalesByExecutivePage() {
  redirect("/dashboard?tab=ejecutivos");
}
