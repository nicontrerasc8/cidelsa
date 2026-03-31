import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { VariationsDashboard } from "@/modules/dashboard/components/variations-dashboard";
import { getVariationsSummary } from "@/modules/dashboard/services/variations";

export default async function VariacionesPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getVariationsSummary();

  return <VariationsDashboard summary={summary} />;
}
