import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BusinessHealthDashboard } from "@/modules/dashboard/components/business-health-dashboard";
import { getCommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

export default async function BusinessHealthPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getCommercialHealthSummary();

  return <BusinessHealthDashboard summary={summary} />;
}
