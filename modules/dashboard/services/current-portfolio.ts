import "server-only";

import { unstable_cache } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { executiveDashboardRoles } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";
import { isCurrentPortfolioSituation } from "@/modules/dashboard/services/import-payload";

export type CurrentPortfolioStatus =
  | "facturado"
  | "valorizacion"
  | "proyecto"
  | "por facturar"
  | "pendiente";

export type CurrentPortfolioRow = {
  importYear: number;
  activityYear: number | null;
  monthIndex: number | null;
  cliente: string | null;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string | null;
  situacion: CurrentPortfolioStatus;
  monto: number;
};

export type CurrentPortfolioSummary = {
  latestYear: number | null;
  years: number[];
  negocios: string[];
  lineas: string[];
  situaciones: CurrentPortfolioStatus[];
  rows: CurrentPortfolioRow[];
};

const SITUATION_ORDER: CurrentPortfolioStatus[] = [
  "facturado",
  "valorizacion",
  "proyecto",
  "por facturar",
  "pendiente",
];

function sortText(a: string, b: string) {
  return a.localeCompare(b, "es");
}

function normalizeComparable(value: string | null) {
  if (!value) return null;
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeNegocio(value: string | null) {
  const normalized = normalizeComparable(value);
  if (!normalized) return null;
  if (normalized === "INDUSTRIAL") return "INDUSTRIAL";
  if (normalized === "GEOSINTETICOS") return "GEOSINTETICOS";
  if (
    normalized === "TENSIONADA" ||
    normalized === "TENSOESTRUCTURA" ||
    normalized === "TENSOESTRUCTURADA"
  ) {
    return "TENSOESTRUCTURA";
  }
  return normalized;
}

function normalizeLinea(value: string | null) {
  return normalizeComparable(value);
}

function pickAmount(primary: number | null, fallback: number | null) {
  if (primary !== null && primary !== 0) return primary;
  if (fallback !== null && fallback !== 0) return fallback;
  return primary ?? fallback;
}

function getCurrentPortfolioAmount(row: {
  situacion: string | null;
  ventasMonto: number | null;
  pipelineMonto: number | null;
}) {
  if (row.situacion === "facturado" || row.situacion === "valorizacion") {
    return pickAmount(row.ventasMonto, row.pipelineMonto);
  }

  return pickAmount(row.pipelineMonto, row.ventasMonto);
}

const loadCurrentPortfolioSummary = unstable_cache(
  async (): Promise<CurrentPortfolioSummary> => {
    const data = await getCachedNormalizedDashboardImportRows();
    const latestYear =
      data.reduce<number | null>((current, row) => {
        if (row.importYear === null) return current;
        if (!isCurrentPortfolioSituation(row.situacion)) return current;
        if (getCurrentPortfolioAmount(row) === null) return current;
        return current === null ? row.importYear : Math.max(current, row.importYear);
      }, null);

    if (latestYear === null) {
      return {
        latestYear: null,
        years: [],
        negocios: [],
        lineas: [],
        situaciones: SITUATION_ORDER,
        rows: [],
      };
    }

    const negocios = new Set<string>();
    const lineas = new Set<string>();
    const years = new Set<number>();
    const rows: CurrentPortfolioRow[] = [];

    for (const row of data) {
      if (!isCurrentPortfolioSituation(row.situacion)) continue;

      const monto = getCurrentPortfolioAmount(row);
      if (monto === null) continue;

      if (row.importYear !== null) years.add(row.importYear);
      const negocio = normalizeNegocio(row.negocio);
      const linea = normalizeLinea(row.linea);

      if (negocio) negocios.add(negocio);
      if (linea) lineas.add(linea);

      rows.push({
        importYear: row.importYear ?? latestYear,
        activityYear: row.activityYear,
        monthIndex: row.monthIndex,
        cliente: row.cliente,
        negocio,
        linea,
        ejecutivo: row.ejecutivo,
        situacion: row.situacion,
        monto,
      });
    }

    return {
      latestYear,
      years: [...years].sort((a, b) => b - a),
      negocios: [...negocios].sort(sortText),
      lineas: [...lineas].sort(sortText),
      situaciones: SITUATION_ORDER,
      rows,
    };
  },
  ["current-portfolio-summary-v3"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getCurrentPortfolioSummary() {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadCurrentPortfolioSummary();
}
