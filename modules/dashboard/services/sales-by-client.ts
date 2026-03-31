import "server-only";

import { executiveDashboardRoles } from "@/lib/auth/roles";
import { requireRoleAccess } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

export type SalesByClientRow = {
  importYear: number;
  cliente: string;
  negocio: string | null;
  linea: string | null;
  ventasMonto: number;
};

export type SalesByClientSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  rows: SalesByClientRow[];
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

export async function getSalesByClientSummary(): Promise<SalesByClientSummary> {
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
      rows: [],
    };
  }

  const rows: SalesByClientRow[] = [];
  const yearSet = new Set<number>();
  const negocioSet = new Set<string>();
  const lineaSet = new Set<string>();

  for (const item of data as Array<{ anio: number; data?: unknown }>) {
    yearSet.add(item.anio);

    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const cliente = normalizeText(payload.cliente);
      const ventasMonto = normalizeNumber(payload.ventas_monto);
      const negocio = normalizeText(payload.negocio);
      const linea = normalizeText(payload.linea);

      if (!cliente || ventasMonto === null) continue;

      if (negocio) negocioSet.add(negocio);
      if (linea) lineaSet.add(linea);

      rows.push({
        importYear: item.anio,
        cliente,
        negocio,
        linea,
        ventasMonto,
      });
    }
  }

  return {
    years: [...yearSet].sort((a, b) => b - a),
    negocios: [...negocioSet].sort((a, b) => a.localeCompare(b)),
    lineas: [...lineaSet].sort((a, b) => a.localeCompare(b)),
    rows,
  };
}
