import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

export type VariationRow = {
  importYear: number;
  negocio: string | null;
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
  periodos: string[];
  lineas: string[];
  rows: VariationRow[];
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

async function getLineToBusinessMap() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select("data, status")
    .eq("status", "processed");

  const lineBusinessCount = new Map<string, Map<string, number>>();

  if (error || !data) return new Map<string, string>();

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

  const resolved = new Map<string, string>();

  for (const [linea, negocioMap] of lineBusinessCount.entries()) {
    const best = [...negocioMap.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) resolved.set(linea, best[0]);
  }

  return resolved;
}

export async function getVariationsSummary(): Promise<VariationsSummary> {
  await requireRoleAccess([...executiveDashboardRoles] as AppRole[]);

  const supabase = await createServerSupabaseClient();
  const [{ data, error }, lineToBusiness] = await Promise.all([
    supabase
      .from("accounting_imports")
      .select("anio, data, status")
      .eq("status", "processed")
      .order("anio", { ascending: false }),
    getLineToBusinessMap(),
  ]);

  if (error || !data) {
    return {
      years: [],
      negocios: [],
      periodos: [],
      lineas: [],
      rows: [],
    };
  }

  const rows: VariationRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const periodoSet = new Set<string>();
  const lineaSet = new Set<string>();

  for (const item of data as Array<{ anio: number; data?: unknown }>) {
    yearSet.add(item.anio);

    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const linea = normalizeText(payload.linea);
      const negocioDirecto = normalizeText(payload.negocio);
      const periodo = normalizeText(payload.periodo);
      const previousReal = normalizeNumber(payload.anio_anterior_real);
      const currentBudget = normalizeNumber(payload.anio_actual_ppto);
      const currentReal = normalizeNumber(payload.anio_actual_real);
      const grossMargin = normalizeNumber(payload.mb);

      if (!linea || previousReal === null || currentBudget === null || currentReal === null) {
        continue;
      }

      lineaSet.add(linea);

      const negocio = negocioDirecto ?? lineToBusiness.get(linea) ?? null;
      if (negocio) negocioSet.add(negocio);
      if (periodo) periodoSet.add(periodo);

      rows.push({
        importYear: item.anio,
        negocio,
        periodo,
        linea,
        previousReal,
        currentBudget,
        currentReal,
        grossMargin,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    periodos: [...periodoSet],
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}
