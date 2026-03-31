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
  const monthTotals = new Array<number>(12).fill(0);

  for (const row of filteredRows) {
    const linea = row.linea ?? "Sin linea";
    const current =
      lineMap.get(linea) ??
      {
        linea,
        months: new Array<number>(12).fill(0),
        total: 0,
      };

    if (row.monthIndex !== null) {
      current.months[row.monthIndex] += row.ventasMonto;
      monthTotals[row.monthIndex] += row.ventasMonto;
    }

    current.total += row.ventasMonto;
    lineMap.set(linea, current);
  }

  const lines = [...lineMap.values()].sort((a, b) => b.total - a.total);
  const grandTotal = monthTotals.reduce((sum, value) => sum + value, 0);

  return {
    months: [...MONTH_LABELS],
    lines,
    monthTotals,
    grandTotal,
  };
}
