import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

export type SalesByExecutiveRow = {
  importYear: number;
  monthIndex: number | null;
  negocio: string | null;
  linea: string | null;
  ejecutivo: string;
  ventasMonto: number;
};

export type SalesByExecutiveSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos: string[];
  rows: SalesByExecutiveRow[];
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

  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/,/g, "")
    .replace(/\$/g, "")
    .replace(/S\/\./gi, "")
    .replace(/S\//gi, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMonthIndex(value: unknown) {
  if (typeof value === "number") {
    const month = Math.trunc(value);
    return month >= 1 && month <= 12 ? month - 1 : null;
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    const month = Math.trunc(numeric);
    return month >= 1 && month <= 12 ? month - 1 : null;
  }

  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const monthMap: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    setiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };

  return monthMap[normalized] ?? null;
}

export async function getSalesByExecutiveSummary(): Promise<SalesByExecutiveSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select("anio, data, status")
    .eq("status", "processed")
    .order("anio", { ascending: false });

  if (error || !data) {
    return {
      years: [],
      negocios: [],
      lineas: [],
      ejecutivos: [],
      rows: [],
    };
  }

  const rows: SalesByExecutiveRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const lineaSet = new Set<string>();
  const ejecutivoSet = new Set<string>();

  for (const item of data as Array<{ anio: number; data?: unknown }>) {
    yearSet.add(item.anio);

    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const ejecutivo = normalizeText(payload.ejecutivo);
      const ventasMonto = normalizeNumber(payload.ventas_monto);
      const negocio = normalizeText(payload.negocio);
      const linea = normalizeText(payload.linea);
      const monthIndex = parseMonthIndex(payload.mes);

      if (!ejecutivo || ventasMonto === null) continue;

      ejecutivoSet.add(ejecutivo);
      if (negocio) negocioSet.add(negocio);
      if (linea) lineaSet.add(linea);

      rows.push({
        importYear: item.anio,
        monthIndex,
        negocio,
        linea,
        ejecutivo,
        ventasMonto,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    ejecutivos: [...ejecutivoSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}
