import "server-only";

import type { BacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";
import { getExecutiveImportRows } from "@/modules/dashboard/services/executive-imports";

export async function getExecutiveBacklogMatrixSummary(): Promise<BacklogMatrixSummary> {
  const importRows = await getExecutiveImportRows();

  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const situacionSet = new Set<string>();
  const etapaSet = new Set<string>();
  const rows: BacklogMatrixSummary["rows"] = [];

  for (const row of importRows) {
    if (row.tipoPipeline !== "backlog") continue;
    if (row.ventasMonto === null) continue;
    if (row.importYear !== null) yearSet.add(row.importYear);
    if (row.negocio) negocioSet.add(row.negocio);
    if (row.etapa) etapaSet.add(row.etapa);
    if (row.situacion) situacionSet.add(row.situacion);

    rows.push({
      importYear: row.importYear,
      negocio: row.negocio,
      linea: row.linea,
      cliente: row.cliente,
      etapa: row.etapa,
      situacion: row.situacion,
      ejecutivo: row.ejecutivo,
      monthIndex: row.monthIndex,
      ventasMonto: row.ventasMonto,
    });
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
