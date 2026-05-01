import { redirect } from "next/navigation";

export default async function SellerYearComparisonPage() {
  redirect("/dashboard?tab=vendedor-comparativo-anual");
}
