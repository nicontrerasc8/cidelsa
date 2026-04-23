import "server-only";

import { unstable_cache } from "next/cache";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_IMPORTS_TAG,
  getCachedNormalizedDashboardImportRows,
} from "@/modules/dashboard/services/dashboard-source-cache";

export type BacklogMatrixSummary = {
  years: number[];
  negocios: string[];
  situaciones: string[];
  etapas: string[];
  ejecutivos: string[];
  lineas: string[];
  debugPayloadRows?: Array<{
    importId: string | null;
    fileName: string | null;
    rowNumber: number | null;
    parseStatus: string | null;
    tipoPipeline: string | null;
    pipelineMonto: number | null;
    ventasMonto: number | null;
    proyeccionMonto: number | null;
    situacion: string | null;
    payload: Record<string, unknown>;
  }>;
  rows: Array<{
    importYear: number | null;
    negocio: string | null;
    linea: string | null;
    cliente: string | null;
    etapa: string | null;
    situacion: string | null;
    ejecutivo: string | null;
    monthIndex: number | null;
    ventasMonto: number;
  }>;
};

const loadBacklogMatrixSummary = unstable_cache(
  async (): Promise<BacklogMatrixSummary> => {
    const data = await getCachedNormalizedDashboardImportRows();

    const candidateRows: BacklogMatrixSummary["rows"] = [];
    const explicitBacklogRows: BacklogMatrixSummary["rows"] = [];

    for (const row of data) {
      if (row.pipelineMonto === null) continue;

      const normalizedRow = {
        importYear: row.importYear,
        negocio: row.negocio,
        linea: row.linea,
        cliente: row.cliente,
        etapa: row.etapa,
        situacion: row.situacion,
        ejecutivo: row.ejecutivo,
        monthIndex: row.monthIndex,
        ventasMonto: row.pipelineMonto,
      };

      candidateRows.push(normalizedRow);
      if (row.tipoPipeline === "backlog") explicitBacklogRows.push(normalizedRow);
    }

    const rows = explicitBacklogRows.length > 0 ? explicitBacklogRows : candidateRows;
    const negocioSet = new Set<string>();
    const yearSet = new Set<number>();
    const situacionSet = new Set<string>();
    const etapaSet = new Set<string>();
    const ejecutivoSet = new Set<string>();
    const lineaSet = new Set<string>();

    for (const row of rows) {
      if (row.importYear !== null) yearSet.add(row.importYear);
      if (row.negocio) negocioSet.add(row.negocio);
      if (row.etapa) etapaSet.add(row.etapa);
      if (row.situacion) situacionSet.add(row.situacion);
      if (row.ejecutivo) ejecutivoSet.add(row.ejecutivo);
      if (row.linea) lineaSet.add(row.linea);
    }

    return {
      years: [...yearSet].sort((a, b) => b - a),
      negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
      situaciones: [...situacionSet].sort((a, b) => a.localeCompare(b)),
      etapas: [...etapaSet].sort((a, b) => a.localeCompare(b)),
      ejecutivos: [...ejecutivoSet].sort((a, b) => a.localeCompare(b)),
      lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
      rows,
    };
  },
  ["backlog-matrix-summary"],
  { tags: [DASHBOARD_IMPORTS_TAG] },
);

export async function getBacklogMatrixSummary(): Promise<BacklogMatrixSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);
  return loadBacklogMatrixSummary();
}
