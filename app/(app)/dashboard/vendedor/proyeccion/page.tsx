import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BacklogMatrixDashboard } from "@/modules/dashboard/components/backlog-matrix-dashboard";
import { getExecutiveProjectionMatrixSummary } from "@/modules/dashboard/services/executive-projection-matrix";

export default async function SellerProjectionPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveProjectionMatrixSummary();

  return (
    <BacklogMatrixDashboard
      summary={summary}
      eyebrow="Dashboard ejecutivo"
      title="Mi proyección por línea y mes"
      description="Proyección visible solo para las filas donde el campo Ejecutivo coincide con tu nombre."
      cardTitle="Matriz de mi proyección"
      totalLabel="Mi proyección total"
      emptyLabel="No hay proyección visible para tu usuario."
      totalVisibleLabel="Total proyección visible:"
      showSituacionBreakdown={false}
      defaultEtapaValue="informacion"
    />
  );
}
