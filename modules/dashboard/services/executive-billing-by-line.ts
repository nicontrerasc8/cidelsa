import "server-only";

import type { BillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";
import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export async function getExecutiveBillingByLineSummary(): Promise<BillingByLineSummary> {
  const importRows = await getExecutiveImportRows();

  const rows: BillingByLineSummary["rows"] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();

  for (const row of importRows) {
    if (row.situacion !== "facturado") continue;
    if (!row.linea || row.ventasMonto === null) continue;

    yearSet.add(row.importYear);
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
}
