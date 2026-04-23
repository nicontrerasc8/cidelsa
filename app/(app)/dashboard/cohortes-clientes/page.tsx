import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { ClientCohortsDashboard } from "@/modules/dashboard/components/client-cohorts-dashboard";
import { getCommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

export default async function ClientCohortsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getCommercialHealthSummary();

  return <ClientCohortsDashboard summary={summary} />;
}
