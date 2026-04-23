import "server-only";

import { unstable_cache } from "next/cache";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";

export type BillingByLineRow = {
  importYear: number | null;
  linea: string;
  negocio: string | null;
  ventasMonto: number;
};

export type BillingByLineSummary = {
  years: number[];
  negocios: string[];
  rows: BillingByLineRow[];
};

const loadBillingByLineSummary = unstable_cache(
  async (): Promise<BillingByLineSummary> => {
    const data = await getCachedNormalizedDashboardImportRows();

    const rows: BillingByLineRow[] = [];
    const yearSet = new Set<number>();
    const negocioSet = new Set<string>();

    for (const row of data) {
      if (!row.hasFacturacion || !row.linea || row.ventasMonto === null) continue;

      if (row.importYear !== null) yearSet.add(row.importYear);
      if (row.negocio) negocioSet.add(row.negocio);

      rows.push({
        importYear: row.importYear,
        linea: row.linea,
        negocio: row.negocio,
        ventasMonto: row.ventasMonto,
      });
    }

    return {
      years: [...yearSet].sort((a, b) => b - a),
      negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
      rows,
    };
  },
  ["billing-by-line-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getBillingByLineSummary(): Promise<BillingByLineSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadBillingByLineSummary();
}
