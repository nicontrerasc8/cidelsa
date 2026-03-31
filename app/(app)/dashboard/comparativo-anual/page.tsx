import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesYearComparisonDashboard } from "@/modules/dashboard/components/sales-year-comparison-dashboard";
import { getSalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";

export default async function SalesYearComparisonPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getSalesByClientSummary();

  return <SalesYearComparisonDashboard summary={summary} />;
}
