import "server-only";

import { unstable_cache } from "next/cache";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";

export type SalesByExecutiveRow = {
  importYear: number | null;
  monthIndex: number | null;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string;
  ventasMonto: number;
};

export type SalesByExecutiveSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos: string[];
  rows: SalesByExecutiveRow[];
};

const loadSalesByExecutiveSummary = unstable_cache(
  async (): Promise<SalesByExecutiveSummary> => {
    const data = await getCachedNormalizedDashboardImportRows();

    const rows: SalesByExecutiveRow[] = [];
    const yearSet = new Set<number>();
    const negocioSet = new Set<string>();
    const lineaSet = new Set<string>();
    const ejecutivoSet = new Set<string>();

    for (const row of data) {
      if (!row.hasFacturacion || !row.ejecutivo || row.ventasMonto === null) continue;

      if (row.importYear !== null) yearSet.add(row.importYear);
      ejecutivoSet.add(row.ejecutivo);
      if (row.negocio) negocioSet.add(row.negocio);
      if (row.linea) lineaSet.add(row.linea);

      rows.push({
        importYear: row.importYear,
        monthIndex: row.monthIndex,
        negocio: row.negocio,
        linea: row.linea,
        ejecutivo: row.ejecutivo,
        ventasMonto: row.ventasMonto,
      });
    }

    return {
      years: [...yearSet].sort((a, b) => b - a),
      negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
      lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
      ejecutivos: [...ejecutivoSet].sort((a, b) => a.localeCompare(b)),
      rows,
    };
  },
  ["sales-by-executive-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getSalesByExecutiveSummary(): Promise<SalesByExecutiveSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadSalesByExecutiveSummary();
}
