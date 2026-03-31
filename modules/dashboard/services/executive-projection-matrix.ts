import "server-only";

import type { ProjectionMatrixSummary } from "@/modules/dashboard/services/projection-matrix";
import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export async function getExecutiveProjectionMatrixSummary(): Promise<ProjectionMatrixSummary> {
  const importRows = await getExecutiveImportRows();

  const negocioSet = new Set<string>();
  const rows: ProjectionMatrixSummary["rows"] = [];

  for (const row of importRows) {
    if (row.tipoPipeline !== "proyeccion") continue;
    if (row.ventasMonto === null) continue;
    if (row.negocio) negocioSet.add(row.negocio);

    rows.push({
      negocio: row.negocio,
      linea: row.linea,
      monthIndex: row.monthIndex,
      ventasMonto: row.ventasMonto,
    });
  }

  return {
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}
