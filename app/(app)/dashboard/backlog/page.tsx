import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BacklogMatrixDashboard } from "@/modules/dashboard/components/backlog-matrix-dashboard";
import { getBacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";

export default async function BacklogPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getBacklogMatrixSummary();

  return <BacklogMatrixDashboard summary={summary} showEtapaFilter={false} />;
}
