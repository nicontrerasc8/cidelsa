import { redirect } from "next/navigation";

export default async function SalesYearComparisonPage() {
  redirect("/dashboard?tab=comparativo-anual");
}
