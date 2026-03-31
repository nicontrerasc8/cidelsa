import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesByClientDashboard } from "@/modules/dashboard/components/sales-by-client-dashboard";
import { getSalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";

export default async function SalesByClientPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getSalesByClientSummary();

  return <SalesByClientDashboard summary={summary} />;
}
