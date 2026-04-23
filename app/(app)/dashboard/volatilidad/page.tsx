import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesVolatilityDashboard } from "@/modules/dashboard/components/sales-volatility-dashboard";
import { getCommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

export default async function VolatilityPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getCommercialHealthSummary();

  return <SalesVolatilityDashboard summary={summary} />;
}
