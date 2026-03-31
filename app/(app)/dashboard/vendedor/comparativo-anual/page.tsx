import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesYearComparisonDashboard } from "@/modules/dashboard/components/sales-year-comparison-dashboard";
import { getExecutiveSalesByClientSummary } from "@/modules/dashboard/services/executive-sales-by-client";

export default async function SellerYearComparisonPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveSalesByClientSummary();

  return <SalesYearComparisonDashboard summary={summary} />;
}
