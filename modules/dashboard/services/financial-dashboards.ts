import "server-only";

import { unstable_cache } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { executiveDashboardRoles } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_ACCOUNTING_TAG,
  DASHBOARD_BUDGET_TAG,
  DASHBOARD_IMPORTS_TAG,
  getCachedProcessedAccountingImports,
  getCachedProcessedBudgetImports,
  getCachedProcessedImports,
} from "@/modules/dashboard/services/dashboard-source-cache";

export type FinancialMetricRow = {
  importYear: number;
  negocio: string | null;
  grupo: string | null;
  periodo: string | null;
  linea: string;
  previousAmount: number;
  plannedAmount: number;
  actualAmount: number;
  grossMargin: number | null;
};

export type FinancialSourceRow = FinancialMetricRow & {
  source: "accounting" | "budget";
};

export type FinancialSummary<T extends FinancialMetricRow = FinancialMetricRow> = {
  years: number[];
  negocios: string[];
  grupos: string[];
  periodos: string[];
  lineas: string[];
  rows: T[];
};

const MONTHLY_ACCOUNTING_FIELDS = [
  { periodo: "Enero", ventas: "enero_ventas", margenBruto: "enero_margen_bruto" },
  { periodo: "Febrero", ventas: "febrero_ventas", margenBruto: "febrero_margen_bruto" },
  { periodo: "Marzo", ventas: "marzo_ventas", margenBruto: "marzo_margen_bruto" },
  { periodo: "Abril", ventas: "abril_ventas", margenBruto: "abril_margen_bruto" },
  { periodo: "Mayo", ventas: "mayo_ventas", margenBruto: "mayo_margen_bruto" },
  { periodo: "Junio", ventas: "junio_ventas", margenBruto: "junio_margen_bruto" },
  { periodo: "Julio", ventas: "julio_ventas", margenBruto: "julio_margen_bruto" },
  { periodo: "Agosto", ventas: "agosto_ventas", margenBruto: "agosto_margen_bruto" },
  { periodo: "Setiembre", ventas: "setiembre_ventas", margenBruto: "setiembre_margen_bruto" },
  { periodo: "Octubre", ventas: "octubre_ventas", margenBruto: "octubre_margen_bruto" },
  { periodo: "Noviembre", ventas: "noviembre_ventas", margenBruto: "noviembre_margen_bruto" },
  { periodo: "Diciembre", ventas: "diciembre_ventas", margenBruto: "diciembre_margen_bruto" },
] as const;

const MONTHLY_ACCOUNTING_AMOUNT_MULTIPLIER = 1000;
const BUDGET_AMOUNT_MULTIPLIER = 1;

type RawImportItem = {
  anio: number;
  data?: unknown;
};

type FinancialAccumulator = {
  importYear: number;
  negocio: string | null;
  grupo: string | null;
  periodo: string | null;
  linea: string;
  previousAmount: number;
  plannedAmount: number;
  actualAmount: number;
  grossMargin: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed
    .replace(/\s/g, "")
    .replace(/\$/g, "")
    .replace(/S\/\./gi, "")
    .replace(/S\//gi, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma && hasDot) {
    normalized = normalized.replace(/,/g, "");
  } else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMonthlyAccountingSales(value: unknown) {
  const amount = normalizeNumber(value);
  return amount === null ? null : amount * MONTHLY_ACCOUNTING_AMOUNT_MULTIPLIER;
}

function normalizeMonthlyAccountingGrossMargin(
  marginValue: unknown,
  salesAmount: number | null,
) {
  const margin = normalizeNumber(marginValue);
  if (margin === null || salesAmount === null) return null;

  const ratio = Math.abs(margin) <= 1 ? margin : margin / 100;
  return salesAmount * ratio;
}

function normalizeBudgetAmount(value: unknown) {
  const amount = normalizeNumber(value);
  return amount === null ? null : amount * BUDGET_AMOUNT_MULTIPLIER;
}

const loadLineToBusinessMap = unstable_cache(
  async () => {
    const lineBusinessCount = new Map<string, Map<string, number>>();
    const data = await getCachedProcessedImports();

    for (const item of data as Array<{ data?: unknown }>) {
      if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

      for (const rawRow of item.data.rows) {
        if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

        const linea = normalizeText(rawRow.payload.linea);
        const negocio = normalizeText(rawRow.payload.negocio);

        if (!linea || !negocio) continue;

        const current = lineBusinessCount.get(linea) ?? new Map<string, number>();
        current.set(negocio, (current.get(negocio) ?? 0) + 1);
        lineBusinessCount.set(linea, current);
      }
    }

    return [...lineBusinessCount.entries()].map(([linea, negocioMap]) => {
      const best = [...negocioMap.entries()].sort((a, b) => b[1] - a[1])[0];
      return [linea, best?.[0] ?? ""] as const;
    }).filter((entry) => entry[1]);
  },
  ["financial-line-to-business-map"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

function buildSummary<T extends FinancialMetricRow>(rows: T[]): FinancialSummary<T> {
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const grupoSet = new Set<string>();
  const periodoSet = new Set<string>();
  const lineaSet = new Set<string>();

  for (const row of rows) {
    yearSet.add(row.importYear);
    if (row.negocio) negocioSet.add(row.negocio);
    if (row.grupo) grupoSet.add(row.grupo);
    if (row.periodo) periodoSet.add(row.periodo);
    lineaSet.add(row.linea);
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    grupos: [...grupoSet].sort((a, b) => a.localeCompare(b)),
    periodos: [...periodoSet],
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}

function finalizeAccumulatorRows(rowsByKey: Map<string, FinancialAccumulator>) {
  return [...rowsByKey.values()].map<FinancialMetricRow>((row) => ({
    ...row,
    grossMargin: row.grossMargin || null,
  }));
}

function buildAccumulatorKey(row: Omit<FinancialMetricRow, "grossMargin" | "previousAmount" | "plannedAmount" | "actualAmount">) {
  return [
    row.importYear,
    row.negocio ?? "",
    row.grupo ?? "",
    row.periodo ?? "",
    row.linea,
  ].join("::");
}

const loadFinancialSourceRows = unstable_cache(
  async (): Promise<FinancialSourceRow[]> => {
    const [accountingData, budgetData, lineToBusinessEntries] = await Promise.all([
      getCachedProcessedAccountingImports(),
      getCachedProcessedBudgetImports(),
      loadLineToBusinessMap(),
    ]);
    const lineToBusiness = new Map(lineToBusinessEntries);
    const rows: FinancialSourceRow[] = [];

    for (const item of accountingData as RawImportItem[]) {
      if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

      for (const rawRow of item.data.rows) {
        if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

        const payload = rawRow.payload;
        const linea = normalizeText(payload.linea);
        const negocioDirecto = normalizeText(payload.negocio);
        const grupo = normalizeText(payload.grupo);
        const periodo = normalizeText(payload.periodo);
        const hasMonthlyAccountingFields = MONTHLY_ACCOUNTING_FIELDS.some(
          (field) => field.ventas in payload || field.margenBruto in payload,
        );

        if (hasMonthlyAccountingFields) {
          if (!linea) continue;

          const negocio = negocioDirecto ?? lineToBusiness.get(linea) ?? null;

          for (const field of MONTHLY_ACCOUNTING_FIELDS) {
            const actualAmount = normalizeMonthlyAccountingSales(payload[field.ventas]);
            const grossMargin = normalizeMonthlyAccountingGrossMargin(
              payload[field.margenBruto],
              actualAmount,
            );

            if (actualAmount === null && grossMargin === null) continue;

            rows.push({
              source: "accounting",
              importYear: item.anio,
              negocio,
              grupo,
              periodo: field.periodo,
              linea,
              previousAmount: 0,
              plannedAmount: 0,
              actualAmount: actualAmount ?? 0,
              grossMargin,
            });
          }

          continue;
        }

        const previousAmount = normalizeNumber(payload.anio_anterior_real);
        const plannedAmount = normalizeNumber(payload.anio_actual_ppto);
        const actualAmount = normalizeNumber(payload.anio_actual_real);
        const grossMargin = normalizeNumber(payload.mb);

        if (!linea || previousAmount === null || plannedAmount === null || actualAmount === null) {
          continue;
        }

        rows.push({
          source: "accounting",
          importYear: item.anio,
          negocio: negocioDirecto ?? lineToBusiness.get(linea) ?? null,
          grupo,
          periodo,
          linea,
          previousAmount,
          plannedAmount,
          actualAmount,
          grossMargin,
        });
      }
    }

    for (const item of budgetData as RawImportItem[]) {
      if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

      for (const rawRow of item.data.rows) {
        if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

        const payload = rawRow.payload;
        const linea = normalizeText(payload.linea);
        const negocio = normalizeText(payload.negocio);
        const grupo = normalizeText(payload.grupo);

        if (!linea) continue;

        const hasMonthlyBudgetFields = MONTHLY_ACCOUNTING_FIELDS.some(
          (field) => field.periodo.toLowerCase() in payload,
        );

        if (hasMonthlyBudgetFields) {
          for (const field of MONTHLY_ACCOUNTING_FIELDS) {
            const periodKey = field.periodo.toLowerCase();
            const plannedAmount = normalizeBudgetAmount(payload[periodKey]);

            if (plannedAmount === null) continue;

            rows.push({
              source: "budget",
              importYear: item.anio,
              negocio,
              grupo,
              periodo: field.periodo,
              linea,
              previousAmount: 0,
              plannedAmount,
              actualAmount: 0,
              grossMargin: null,
            });
          }

          continue;
        }

        const previousAmount = normalizeBudgetAmount(
          payload.proyeccion_cierre_anio_anterior,
        );
        const plannedAmount = normalizeBudgetAmount(payload.plan_anio_actual);

        if (previousAmount === null && plannedAmount === null) continue;

        rows.push({
          source: "budget",
          importYear: item.anio,
          negocio,
          grupo,
          periodo: "Anual",
          linea,
          previousAmount: previousAmount ?? 0,
          plannedAmount: plannedAmount ?? 0,
          actualAmount: 0,
          grossMargin: null,
        });
      }
    }

    return rows;
  },
  ["financial-source-rows"],
  { tags: [DASHBOARD_IMPORTS_TAG, DASHBOARD_ACCOUNTING_TAG, DASHBOARD_BUDGET_TAG] },
);

export async function getAccountingDashboardSummary() {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadAccountingDashboardSummary();
}

export async function getBudgetDashboardSummary() {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadBudgetDashboardSummary();
}

export async function getBudgetAccountingComparisonSummary() {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadBudgetAccountingComparisonSummary();
}

const loadAccountingDashboardSummary = unstable_cache(
  async () => {
    const rows = await loadFinancialSourceRows();
    return buildSummary(
      rows.filter(
        (row): row is FinancialSourceRow & { source: "accounting" } =>
          row.source === "accounting",
      ),
    );
  },
  ["financial-accounting-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG, DASHBOARD_ACCOUNTING_TAG, DASHBOARD_BUDGET_TAG] },
);

const loadBudgetDashboardSummary = unstable_cache(
  async () => {
    const rows = await loadFinancialSourceRows();
    return buildSummary(
      rows.filter(
        (row): row is FinancialSourceRow & { source: "budget" } =>
          row.source === "budget",
      ),
    );
  },
  ["financial-budget-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG, DASHBOARD_ACCOUNTING_TAG, DASHBOARD_BUDGET_TAG] },
);

const loadBudgetAccountingComparisonSummary = unstable_cache(
  async () => {
    const rows = await loadFinancialSourceRows();
    const rowsByKey = new Map<string, FinancialAccumulator>();

    for (const row of rows) {
      const key = buildAccumulatorKey(row);
      const current =
        rowsByKey.get(key) ??
        {
          importYear: row.importYear,
          negocio: row.negocio,
          grupo: row.grupo,
          periodo: row.periodo,
          linea: row.linea,
          previousAmount: 0,
          plannedAmount: 0,
          actualAmount: 0,
          grossMargin: 0,
        };

      current.previousAmount += row.previousAmount;
      current.plannedAmount += row.plannedAmount;
      current.actualAmount += row.actualAmount;
      current.grossMargin += row.grossMargin ?? 0;
      rowsByKey.set(key, current);
    }

    return buildSummary(finalizeAccumulatorRows(rowsByKey));
  },
  ["financial-budget-accounting-comparison-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG, DASHBOARD_ACCOUNTING_TAG, DASHBOARD_BUDGET_TAG] },
);
