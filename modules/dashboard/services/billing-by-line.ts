import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

export type BillingByLineRow = {
  importYear: number;
  linea: string;
  negocio: string | null;
  ventasMonto: number;
};

export type BillingByLineSummary = {
  years: number[];
  negocios: string[];
  rows: BillingByLineRow[];
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

function normalizeSituation(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function getBillingByLineSummary(): Promise<BillingByLineSummary> {
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
      rows: [],
    };
  }

  const rows: BillingByLineRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();

  for (const item of data as Array<{ anio: number; data?: unknown }>) {
    yearSet.add(item.anio);

    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const situacion = normalizeSituation(payload.situacion);
      if (situacion !== "facturado") continue;

      const linea = normalizeText(payload.linea);
      const negocio = normalizeText(payload.negocio);
      const ventasMonto = normalizeNumber(payload.ventas_monto);

      if (!linea || ventasMonto === null) continue;

      if (negocio) negocioSet.add(negocio);

      rows.push({
        importYear: item.anio,
        linea,
        negocio,
        ventasMonto,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}
