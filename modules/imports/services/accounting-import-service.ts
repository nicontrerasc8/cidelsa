import "server-only";

import { revalidatePath } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import type { CurrentUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ImportRecord } from "@/lib/types/database";
import { validateImportFile } from "@/lib/validators/imports";
import { parseAccountingWorkbook } from "@/modules/imports/parser/accounting";
import { importAccessRoles } from "@/modules/imports/services/import-service";

type RecentAccountingImportRow = ImportRecord & {
  data?: unknown;
  profiles: Array<{ full_name: string | null; email: string }>;
};

type AccountingImportJsonRow = {
  id: number;
  row_number: number;
  parse_status: "valid" | "error";
  parse_errors: string[];
  payload: Record<string, unknown>;
};

type AccountingImportJsonPayload = {
  sheetName: string;
  columns: string[];
  rows: AccountingImportJsonRow[];
};

const ACCOUNTING_BUSINESSES = [
  "Industrial",
  "Geosinteticos",
  "Tensoestructuras",
] as const;

const ACCOUNTING_PERIODS = [
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

function normalizeAccountingBusiness(value: string) {
  const normalized = value.trim();

  if (!ACCOUNTING_BUSINESSES.includes(normalized as (typeof ACCOUNTING_BUSINESSES)[number])) {
    throw new Error("Debes seleccionar un negocio contable valido.");
  }

  return normalized;
}

function normalizeAccountingPeriod(value: string) {
  const normalized = value.trim();

  if (!ACCOUNTING_PERIODS.includes(normalized as (typeof ACCOUNTING_PERIODS)[number])) {
    throw new Error("Debes seleccionar un periodo contable valido.");
  }

  return normalized;
}

function buildAccountingPeriodLabel(periodoDesde: string, periodoHasta: string) {
  if (periodoDesde === periodoHasta) return periodoDesde;
  return `${periodoDesde} a ${periodoHasta}`;
}

function normalizeAccountingPeriodRange(desdeRaw: string, hastaRaw: string) {
  const periodoDesde = normalizeAccountingPeriod(desdeRaw);
  const periodoHasta = normalizeAccountingPeriod(hastaRaw);
  const desdeIndex = ACCOUNTING_PERIODS.indexOf(periodoDesde as (typeof ACCOUNTING_PERIODS)[number]);
  const hastaIndex = ACCOUNTING_PERIODS.indexOf(periodoHasta as (typeof ACCOUNTING_PERIODS)[number]);

  if (desdeIndex > hastaIndex) {
    throw new Error("El periodo inicial no puede ser mayor que el periodo final.");
  }

  return {
    periodoDesde,
    periodoHasta,
    periodo: buildAccountingPeriodLabel(periodoDesde, periodoHasta),
  };
}

function normalizeImportRecord(row: RecentAccountingImportRow): ImportRecord {
  return {
    ...row,
    uploaded_by_profile: row.profiles?.[0] ?? null,
  };
}

function buildImportSourceRef(fileName: string, userId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");

  return `inline://accounting/${userId}/${timestamp}-${normalizedFileName}`;
}

function buildImportData(
  parsed: Awaited<ReturnType<typeof parseAccountingWorkbook>>,
  negocio: string,
  periodoRange: { periodo: string; periodoDesde: string; periodoHasta: string },
) {
  return {
    sheetName: parsed.sheetName,
    columns: [...parsed.columns, "negocio", "periodo_desde", "periodo_hasta", "periodo"],
    rows: parsed.parsedRows.map((row) => ({
      id: row.rowNumber,
      row_number: row.rowNumber,
      parse_status: row.parseStatus,
      parse_errors: row.parseErrors,
      payload: {
        ...row.payload,
        negocio,
        periodo_desde: periodoRange.periodoDesde,
        periodo_hasta: periodoRange.periodoHasta,
        periodo: periodoRange.periodo,
      },
    })),
  } satisfies AccountingImportJsonPayload;
}

function buildPreviewRows(data: AccountingImportJsonPayload) {
  return data.rows.map((row) => ({
    fila_excel: row.row_number,
    parse_status: row.parse_status,
    ...row.payload,
  }));
}

export async function createAccountingImportFromUpload(
  file: File,
  currentUser: CurrentUser,
  importYear: number,
  negocioRaw: string,
  periodoDesdeRaw: string,
  periodoHastaRaw: string,
) {
  const admin = createAdminSupabaseClient();
  validateImportFile(file);
  const parsed = await parseAccountingWorkbook(file);
  const negocio = normalizeAccountingBusiness(negocioRaw);
  const periodoRange = normalizeAccountingPeriodRange(periodoDesdeRaw, periodoHastaRaw);
  const storagePath = buildImportSourceRef(file.name, currentUser.id);

  console.groupCollapsed("[accounting-imports][service] Resumen de importacion");
  console.log("archivo", file.name);
  console.log("usuario", currentUser.id);
  console.log("anio_importacion", importYear);
  console.log("negocio", negocio);
  console.log("periodo", periodoRange.periodo);
  console.log("hoja", parsed.sheetName);
  console.log("columnas", parsed.columns);
  console.log("total_filas", parsed.parsedRows.length);
  console.groupEnd();

  const { data: importRow, error: importError } = await admin
    .from("accounting_imports")
    .insert({
      file_name: file.name,
      storage_path: storagePath,
      anio: importYear,
      uploaded_by: currentUser.id,
      status: "processing",
      total_rows: parsed.parsedRows.length,
      valid_rows: parsed.parsedRows.length,
      error_rows: 0,
      sheet_name: parsed.sheetName,
      notes: `Hoja ${parsed.sheetName}. Negocio ${negocio}. Periodo ${periodoRange.periodo}. Archivo de contabilidad persistido en JSON dentro de accounting_imports.data.`,
      data: {},
    })
    .select("id")
    .single();

  if (importError || !importRow) {
    throw new Error("No se pudo registrar la importacion contable.");
  }

  const importData = buildImportData(parsed, negocio, periodoRange);

  const { error: updateError } = await admin
    .from("accounting_imports")
    .update({
      status: "processed",
      data: importData,
    })
    .eq("id", importRow.id as string);

  if (updateError) {
    await admin
      .from("accounting_imports")
      .update({
        status: "failed",
        notes: "Fallo al guardar el JSON de contabilidad en accounting_imports.data.",
      })
      .eq("id", importRow.id as string);

    throw new Error("No se pudo guardar el JSON de la importacion contable.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard");

  return {
    id: importRow.id as string,
    fileName: file.name,
    importYear,
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    previewRows: buildPreviewRows(importData),
    totalRows: parsed.parsedRows.length,
    validRows: parsed.parsedRows.length,
    errorRows: 0,
  };
}

export async function listRecentAccountingImports() {
  await requireRoleAccess([...importAccessRoles]);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("accounting_imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, profiles!accounting_imports_uploaded_by_fkey(full_name, email)",
    )
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) return [];

  return ((data ?? []) as unknown as RecentAccountingImportRow[]).map(normalizeImportRecord);
}

export async function deleteAccountingImport(importId: string) {
  await requireRoleAccess([...importAccessRoles]);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("accounting_imports")
    .delete()
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo eliminar la importacion contable.");
  }

  revalidatePath("/dashboard/imports");
}
