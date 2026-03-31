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
      eyebrow="Dashboard proyeccion"
      title="Proyección por linea y mes"
      description="Se consideran solo filas donde `BL / Proy` llega como `Proyección`. El cuadro muestra ventas distribuidas por linea y mes, con filtro por negocio."
      cardTitle="Matriz de proyección"
      totalLabel="Proyección total"
      emptyLabel="No hay proyección para el negocio seleccionado."
      totalVisibleLabel="Total proyección visible:"
    />
  );
}
