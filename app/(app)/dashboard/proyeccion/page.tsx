import { forbidden } from "next/navigation";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BacklogMatrixDashboard } from "@/modules/dashboard/components/backlog-matrix-dashboard";
import { getProjectionMatrixSummary } from "@/modules/dashboard/services/projection-matrix";

export default async function ProjectionPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getProjectionMatrixSummary();

  return (
    <BacklogMatrixDashboard
      summary={summary}
      eyebrow="Dashboard proyección"
      title="Proyección por línea y mes"
      description=""
      cardTitle="Matriz de proyección"
      totalLabel="Proyección total"
      emptyLabel="No hay proyección para el negocio seleccionado."
      totalVisibleLabel="Total proyección visible:"
      showSituacionBreakdown={false}
    />
  );
}
