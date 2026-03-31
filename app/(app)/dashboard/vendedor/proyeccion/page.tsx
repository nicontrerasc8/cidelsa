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
      title="Mi proyeccion por linea y mes"
      description="Proyeccion visible solo para las filas donde el campo Ejecutivo coincide con tu nombre."
      cardTitle="Matriz de mi proyeccion"
      totalLabel="Mi proyeccion total"
      emptyLabel="No hay proyeccion visible para tu usuario."
      totalVisibleLabel="Total proyeccion visible:"
    />
  );
}
