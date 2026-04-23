import "server-only";

import { unstable_cache } from "next/cache";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";
import { getExecutiveImportRows, type ExecutiveImportRow } from "@/modules/dashboard/services/executive-imports";

export type CommercialHealthRow = {
  importYear: number | null;
  activityYear: number | null;
  monthIndex: number | null;
  cliente: string;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string | null;
  situacion: string | null;
  ventasMonto: number;
  fechaFacturacion: string | null;
};

export type CommercialHealthSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos: string[];
  rows: CommercialHealthRow[];
};

function sortText(a: string, b: string) {
  return a.localeCompare(b, "es");
}

function buildSummary(rows: CommercialHealthRow[]): CommercialHealthSummary {
  const years = new Set<number>();
  const negocios = new Set<string>();
  const lineas = new Set<string>();
  const ejecutivos = new Set<string>();

  for (const row of rows) {
    if (row.activityYear !== null) years.add(row.activityYear);
    else if (row.importYear !== null) years.add(row.importYear);
    if (row.negocio) negocios.add(row.negocio);
    if (row.linea) lineas.add(row.linea);
    if (row.ejecutivo) ejecutivos.add(row.ejecutivo);
  }

  return {
    years: [...years].sort((a, b) => b - a),
    negocios: [...negocios].sort(sortText),
    lineas: [...lineas].sort(sortText),
    ejecutivos: [...ejecutivos].sort(sortText),
    rows: rows.sort((a, b) => {
      const yearDiff = (b.importYear ?? 0) - (a.importYear ?? 0);
      if (yearDiff !== 0) return yearDiff;

      const monthDiff = (b.monthIndex ?? -1) - (a.monthIndex ?? -1);
      if (monthDiff !== 0) return monthDiff;

      return b.ventasMonto - a.ventasMonto;
    }),
  };
}

function normalizeExecutiveRows(importRows: ExecutiveImportRow[]) {
  const rows: CommercialHealthRow[] = [];

  for (const row of importRows) {
    if (!row.cliente || row.ventasMonto === null) continue;

    rows.push({
      importYear: row.importYear,
      activityYear: row.activityYear,
      monthIndex: row.monthIndex,
      cliente: row.cliente,
      negocio: row.negocio,
      linea: row.linea,
      ejecutivo: row.ejecutivo,
      situacion: row.situacion,
      ventasMonto: row.ventasMonto,
      fechaFacturacion: row.fechaFacturacion,
    });
  }

  return buildSummary(rows);
}

export async function getCommercialHealthSummary(): Promise<CommercialHealthSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadCommercialHealthSummary();
}

export async function getExecutiveCommercialHealthSummary(): Promise<CommercialHealthSummary> {
  const rows = await getExecutiveImportRows();
  return normalizeExecutiveRows(rows);
}

const loadCommercialHealthSummary = unstable_cache(
  async (): Promise<CommercialHealthSummary> => {
    const data = await getCachedNormalizedDashboardImportRows();
    const rows: CommercialHealthRow[] = [];

    for (const row of data) {
      if (!row.hasFacturacion || !row.cliente || row.ventasMonto === null) continue;

      rows.push({
        importYear: row.importYear,
        activityYear: row.activityYear,
        monthIndex: row.monthIndex,
        cliente: row.cliente,
        negocio: row.negocio,
        linea: row.linea,
        ejecutivo: row.ejecutivo,
        situacion: row.situacion,
        ventasMonto: row.ventasMonto,
        fechaFacturacion: row.fechaFacturacion,
      });
    }

    return buildSummary(rows);
  },
  ["commercial-health-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);
