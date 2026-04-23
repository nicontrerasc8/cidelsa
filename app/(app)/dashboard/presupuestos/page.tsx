import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { FinancialFocusDashboard } from "@/modules/dashboard/components/financial-focus-dashboard";
import { getBudgetDashboardSummary } from "@/modules/dashboard/services/financial-dashboards";

export default async function PresupuestosPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getBudgetDashboardSummary();

  return <FinancialFocusDashboard mode="budget" summary={summary} />;
}
