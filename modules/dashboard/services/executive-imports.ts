import "server-only";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { sellerDashboardRoles } from "@/lib/auth/roles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ImportRow = {
  anio: number;
  data?: unknown;
};

export type ExecutiveImportRow = {
  importYear: number;
  cliente: string | null;
  negocio: string | null;
  linea: string | null;
  situacion: string | null;
  monthIndex: number | null;
  tipoPipeline: string | null;
  ventasMonto: number | null;
  fechaFacturacion: string | null;
  ejecutivo: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeComparableText(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeNumber(value: unknown) {
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

export function normalizePipeline(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function normalizeSituation(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMonthIndex(value: unknown) {
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

export async function getExecutiveImportRows() {
  const user = await requireRoleAccess([...sellerDashboardRoles]);
  const normalizedUserName = normalizeComparableText(user.fullName);

  if (!normalizedUserName) {
    return [] as ExecutiveImportRow[];
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select("anio, data, status")
    .eq("status", "processed")
    .order("anio", { ascending: false });

  if (error || !data) {
    return [] as ExecutiveImportRow[];
  }

  const rows: ExecutiveImportRow[] = [];

  for (const item of data as ImportRow[]) {
    if (!isRecord(item.data) || !Array.isArray(item.data.rows)) continue;

    for (const rawRow of item.data.rows) {
      if (!isRecord(rawRow) || !isRecord(rawRow.payload)) continue;

      const payload = rawRow.payload;
      const ejecutivo = normalizeComparableText(payload.ejecutivo);

      if (ejecutivo !== normalizedUserName) continue;

      rows.push({
        importYear: item.anio,
        cliente: normalizeText(payload.cliente),
        negocio: normalizeText(payload.negocio),
        linea: normalizeText(payload.linea),
        situacion: normalizeSituation(payload.situacion),
        monthIndex: parseMonthIndex(payload.mes),
        tipoPipeline: normalizePipeline(payload.tipo_pipeline),
        ventasMonto: normalizeNumber(payload.ventas_monto),
        fechaFacturacion: normalizeText(payload.fecha_facturacion),
        ejecutivo: normalizeText(payload.ejecutivo),
      });
    }
  }

  return rows;
}
