import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BacklogMatrixDashboard } from "@/modules/dashboard/components/backlog-matrix-dashboard";
import { getExecutiveBacklogMatrixSummary } from "@/modules/dashboard/services/executive-backlog-matrix";

export default async function SellerBacklogPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveBacklogMatrixSummary();

  return (
    <BacklogMatrixDashboard
      summary={summary}
      eyebrow="Dashboard ejecutivo"
      title="Mi backlog por linea y mes"
      description="Backlog visible solo para las filas donde el campo Ejecutivo coincide con tu nombre."
      cardTitle="Matriz de mi backlog"
      totalLabel="Mi backlog total"
      emptyLabel="No hay backlog visible para tu usuario."
      totalVisibleLabel="Total backlog visible:"
    />
  );
}
