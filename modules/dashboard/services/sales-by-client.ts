import "server-only";

import { unstable_cache } from "next/cache";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";

export type SalesByClientRow = {
  importYear: number | null;
  cliente: string;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string | null;
  ventasMonto: number;
};

export type SalesByClientSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos: string[];
  rows: SalesByClientRow[];
};

const loadSalesByClientSummary = unstable_cache(
  async (): Promise<SalesByClientSummary> => {
    const data = await getCachedNormalizedDashboardImportRows();

    const rows: SalesByClientRow[] = [];
    const yearSet = new Set<number>();
    const negocioSet = new Set<string>();
    const lineaSet = new Set<string>();
    const ejecutivoSet = new Set<string>();

    for (const row of data) {
      if (!row.cliente || row.ventasMonto === null) continue;

      if (row.importYear !== null) yearSet.add(row.importYear);
      if (row.negocio) negocioSet.add(row.negocio);
      if (row.linea) lineaSet.add(row.linea);
      if (row.ejecutivo) ejecutivoSet.add(row.ejecutivo);

      rows.push({
        importYear: row.importYear,
        cliente: row.cliente,
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
  ["sales-by-client-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getSalesByClientSummary(): Promise<SalesByClientSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadSalesByClientSummary();
}
