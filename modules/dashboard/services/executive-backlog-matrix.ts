import "server-only";

import type { BacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";
import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export async function getExecutiveBacklogMatrixSummary(): Promise<BacklogMatrixSummary> {
  const importRows = await getExecutiveImportRows();

  const candidateRows: BacklogMatrixSummary["rows"] = [];
  const explicitBacklogRows: BacklogMatrixSummary["rows"] = [];

  for (const row of importRows) {
    const pipelineMonto = row.pipelineMonto;
    if (pipelineMonto === null) continue;

    const summaryRow = {
      importYear: row.importYear,
      negocio: row.negocio,
      linea: row.linea,
      cliente: row.cliente,
      etapa: row.etapa,
      situacion: row.situacion,
      ejecutivo: row.ejecutivo,
      monthIndex: row.monthIndex,
      ventasMonto: pipelineMonto,
    };

    candidateRows.push(summaryRow);
    if (row.tipoPipeline === "backlog") explicitBacklogRows.push(summaryRow);
  }

  const rows = explicitBacklogRows.length > 0 ? explicitBacklogRows : candidateRows;
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const situacionSet = new Set<string>();
  const etapaSet = new Set<string>();

  for (const row of rows) {
    if (row.importYear !== null) yearSet.add(row.importYear);
    if (row.negocio) negocioSet.add(row.negocio);
    if (row.etapa) etapaSet.add(row.etapa);
    if (row.situacion) situacionSet.add(row.situacion);
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    situaciones: [...situacionSet].sort((a, b) => a.localeCompare(b)),
    etapas: [...etapaSet].sort((a, b) => a.localeCompare(b)),
    ejecutivos: [],
    lineas: [...new Set(rows.map((row) => row.linea).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}
