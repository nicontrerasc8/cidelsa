import type { BacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";

const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
const WITHOUT_MONTH_LABEL = "Sin mes";

export type BacklogMatrixLine = {
  linea: string;
  months: number[];
  total: number;
};

export function buildBacklogMatrix(
  summary: BacklogMatrixSummary,
  selectedNegocio: string | null,
) {
  const filteredRows = summary.rows.filter((row) => {
    if (!selectedNegocio) return true;
    return row.negocio === selectedNegocio;
  });

  const lineMap = new Map<string, BacklogMatrixLine>();
  const hasRowsWithoutMonth = filteredRows.some((row) => row.monthIndex === null);
  const months = hasRowsWithoutMonth
    ? [...MONTH_LABELS, WITHOUT_MONTH_LABEL]
    : [...MONTH_LABELS];
  const monthTotals = new Array<number>(months.length).fill(0);

  for (const row of filteredRows) {
    const linea = row.linea ?? "Sin linea";
    const current =
      lineMap.get(linea) ??
      {
        linea,
        months: new Array<number>(months.length).fill(0),
        total: 0,
      };
    const monthIndex = row.monthIndex ?? (hasRowsWithoutMonth ? MONTH_LABELS.length : null);

    if (monthIndex !== null) {
      current.months[monthIndex] += row.ventasMonto;
      monthTotals[monthIndex] += row.ventasMonto;
    }

    current.total += row.ventasMonto;
    lineMap.set(linea, current);
  }

  const lines = [...lineMap.values()].sort((a, b) => b.total - a.total);
  const grandTotal = lines.reduce((sum, line) => sum + line.total, 0);

  return {
    months,
    lines,
    monthTotals,
    grandTotal,
  };
}
