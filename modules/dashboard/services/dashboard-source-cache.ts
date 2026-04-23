import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  getPayloadCliente,
  getPayloadEjecutivo,
  getPayloadNegocio,
  getPayloadPipeline,
  getPayloadPipelineMonto,
  getPayloadVentasMonto,
  getPayloadYear,
  hasFacturacion,
  isRecord,
  normalizeComparableText,
  normalizeSituation,
  normalizeText,
  parseMonthIndex,
} from "@/modules/dashboard/services/import-payload";

export const DASHBOARD_IMPORTS_TAG = "dashboard-imports";
export const DASHBOARD_ACCOUNTING_TAG = "dashboard-accounting-imports";
export const DASHBOARD_BUDGET_TAG = "dashboard-budget-imports";

type CachedImportSourceRow = {
  anio: number | null;
  data?: unknown;
};

type CachedFinancialSourceRow = {
  anio: number;
  data?: unknown;
};

export type CachedDashboardImportRow = {
  importYear: number | null;
  activityYear: number | null;
  monthIndex: number | null;
  cliente: string | null;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string | null;
  comparableEjecutivo: string | null;
  etapa: string | null;
  situacion: string | null;
  tipoPipeline: string | null;
  ventasMonto: number | null;
  pipelineMonto: number | null;
  fechaFacturacion: string | null;
  hasFacturacion: boolean;
};

function parseYearFromDate(value: string | null) {
  if (!value) return null;

  const trimmed = value.trim();

  const isoMatch = trimmed.match(/^(\d{4})[-/.]/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    return Number.isFinite(year) ? year : null;
  }

  const endYearMatch = trimmed.match(/(?:^|[\/.\-\s])(\d{4})$/);
  if (endYearMatch) {
    const year = Number(endYearMatch[1]);
    return Number.isFinite(year) ? year : null;
  }

  const embeddedYearMatches = [...trimmed.matchAll(/\b(19\d{2}|20\d{2}|21\d{2})\b/g)];
  if (embeddedYearMatches.length > 0) {
    const year = Number(embeddedYearMatches[embeddedYearMatches.length - 1]?.[1]);
    return Number.isFinite(year) ? year : null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear();
}

const loadProcessedImports = unstable_cache(
  async (): Promise<CachedImportSourceRow[]> => {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("imports")
      .select("anio, data")
      .eq("status", "processed")
      .order("uploaded_at", { ascending: false });

    if (error || !data) return [];
    return data as CachedImportSourceRow[];
  },
  ["dashboard-processed-imports"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

const loadProcessedAccountingImports = unstable_cache(
  async (): Promise<CachedFinancialSourceRow[]> => {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("accounting_imports")
      .select("anio, data")
      .eq("status", "processed")
      .order("anio", { ascending: false });

    if (error || !data) return [];
    return data as CachedFinancialSourceRow[];
  },
  ["dashboard-processed-accounting-imports"],
  { tags: [DASHBOARD_ACCOUNTING_TAG] },
);

const loadProcessedBudgetImports = unstable_cache(
  async (): Promise<CachedFinancialSourceRow[]> => {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("budget_imports")
      .select("anio, data")
      .eq("status", "processed")
      .order("anio", { ascending: false });

    if (error || !data) return [];
    return data as CachedFinancialSourceRow[];
  },
  ["dashboard-processed-budget-imports"],
  { tags: [DASHBOARD_BUDGET_TAG] },
);

const loadNormalizedDashboardImportRows = unstable_cache(
  async (): Promise<CachedDashboardImportRow[]> => {
    const data = await loadProcessedImports();
    const rows: CachedDashboardImportRow[] = [];

    for (const item of data) {
      if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

      for (const rawRow of item.data.rows) {
        if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

        const payload = rawRow.payload;
        const fechaFacturacion = normalizeText(payload.fecha_facturacion);
        const importYear = getPayloadYear(payload.anio) ?? item.anio;

        rows.push({
          importYear,
          activityYear: parseYearFromDate(fechaFacturacion) ?? importYear,
          monthIndex: parseMonthIndex(payload.mes),
          cliente: getPayloadCliente(payload),
          negocio: getPayloadNegocio(payload),
          linea: normalizeText(payload.linea),
          ejecutivo: getPayloadEjecutivo(payload),
          comparableEjecutivo: normalizeComparableText(payload.ejecutivo),
          etapa: normalizeComparableText(payload.etapa),
          situacion: normalizeSituation(payload.situacion),
          tipoPipeline: getPayloadPipeline(payload),
          ventasMonto: getPayloadVentasMonto(payload),
          pipelineMonto: getPayloadPipelineMonto(payload),
          fechaFacturacion,
          hasFacturacion: hasFacturacion(payload),
        });
      }
    }

    return rows;
  },
  ["dashboard-normalized-import-rows"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getCachedProcessedImports() {
  return loadProcessedImports();
}

export async function getCachedProcessedAccountingImports() {
  return loadProcessedAccountingImports();
}

export async function getCachedProcessedBudgetImports() {
  return loadProcessedBudgetImports();
}

export async function getCachedNormalizedDashboardImportRows() {
  return loadNormalizedDashboardImportRows();
}

export function revalidateDashboardDataCache() {
  revalidateTag(DASHBOARD_IMPORTS_TAG, { expire: 0 });
  revalidateTag(DASHBOARD_ACCOUNTING_TAG, { expire: 0 });
  revalidateTag(DASHBOARD_BUDGET_TAG, { expire: 0 });
}
