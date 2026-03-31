import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesByExecutiveDashboard } from "@/modules/dashboard/components/sales-by-executive-dashboard";
import { getSalesByExecutiveSummary } from "@/modules/dashboard/services/sales-by-executive";

export default async function SalesByExecutivePage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getSalesByExecutiveSummary();

  return <SalesByExecutiveDashboard summary={summary} />;
}
