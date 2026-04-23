import "server-only";

import { unstable_cache } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { sellerDashboardRoles } from "@/lib/auth/roles";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";
import { normalizeComparableText } from "@/modules/dashboard/services/import-payload";

export type ExecutiveImportRow = {
  importYear: number | null;
  activityYear: number | null;
  cliente: string | null;
  negocio: string | null;
  linea: string | null;
  etapa: string | null;
  situacion: string | null;
  monthIndex: number | null;
  tipoPipeline: string | null;
  ventasMonto: number | null;
  pipelineMonto: number | null;
  fechaFacturacion: string | null;
  ejecutivo: string | null;
};

const loadExecutiveImportRows = unstable_cache(
  async (normalizedUserName: string): Promise<ExecutiveImportRow[]> => {
    const data = await getCachedNormalizedDashboardImportRows();
    const rows: ExecutiveImportRow[] = [];

    for (const row of data) {
      if (row.comparableEjecutivo !== normalizedUserName) continue;

      rows.push({
        importYear: row.importYear,
        activityYear: row.activityYear,
        cliente: row.cliente,
        negocio: row.negocio,
        linea: row.linea,
        etapa: row.etapa,
        situacion: row.situacion,
        monthIndex: row.monthIndex,
        tipoPipeline: row.tipoPipeline,
        ventasMonto: row.ventasMonto,
        pipelineMonto: row.pipelineMonto,
        fechaFacturacion: row.fechaFacturacion,
        ejecutivo: row.ejecutivo,
      });
    }

    return rows;
  },
  ["executive-import-rows-by-user"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getExecutiveImportRows() {
  const user = await requireRoleAccess([...sellerDashboardRoles]);
  const normalizedUserName = normalizeComparableText(user.fullName);

  if (!normalizedUserName) {
    return [] as ExecutiveImportRow[];
  }

  return loadExecutiveImportRows(normalizedUserName);
}
