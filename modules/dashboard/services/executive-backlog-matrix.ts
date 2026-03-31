import "server-only";

import type { BacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";
import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export async function getExecutiveBacklogMatrixSummary(): Promise<BacklogMatrixSummary> {
  const importRows = await getExecutiveImportRows();

  const negocioSet = new Set<string>();
  const rows: BacklogMatrixSummary["rows"] = [];

  for (const row of importRows) {
    if (row.tipoPipeline !== "backlog") continue;
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
