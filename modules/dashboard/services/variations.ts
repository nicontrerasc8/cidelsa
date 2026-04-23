import { getBudgetAccountingComparisonSummary } from "@/modules/dashboard/services/financial-dashboards";

export type VariationRow = {
  importYear: number;
  negocio: string | null;
  grupo: string | null;
  periodo: string | null;
  linea: string;
  previousReal: number;
  currentBudget: number;
  currentReal: number;
  grossMargin: number | null;
};

export type VariationsSummary = {
  years: number[];
  negocios: string[];
  grupos: string[];
  periodos: string[];
  lineas: string[];
  rows: VariationRow[];
};

export async function getVariationsSummary() {
  const summary = await getBudgetAccountingComparisonSummary();

  return {
    ...summary,
    rows: summary.rows.map((row) => ({
      importYear: row.importYear,
      negocio: row.negocio,
      grupo: row.grupo,
      periodo: row.periodo,
      linea: row.linea,
      previousReal: row.previousAmount,
      currentBudget: row.plannedAmount,
      currentReal: row.actualAmount,
      grossMargin: row.grossMargin,
    })),
  } satisfies VariationsSummary;
}
