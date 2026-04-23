import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { FinancialFocusDashboard } from "@/modules/dashboard/components/financial-focus-dashboard";
import { getAccountingDashboardSummary } from "@/modules/dashboard/services/financial-dashboards";

export default async function ContabilidadPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getAccountingDashboardSummary();

  return <FinancialFocusDashboard mode="accounting" summary={summary} />;
}
