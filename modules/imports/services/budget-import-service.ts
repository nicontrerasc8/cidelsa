import "server-only";

import { revalidatePath } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import type { CurrentUser } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { ImportRecord } from "@/lib/types/database";
import { importYearSchema, validateImportFile } from "@/lib/validators/imports";
import { parseBudgetWorkbook } from "@/modules/imports/parser/budget";
import { revalidateDashboardDataCache } from "@/modules/dashboard/services/dashboard-source-cache";
import { buildImportAudit, type ImportAudit } from "@/modules/imports/services/import-audit";
import { importAccessRoles } from "@/modules/imports/services/import-service";

type RecentBudgetImportRow = ImportRecord & {
  data?: unknown;
  profiles: Array<{ full_name: string | null; email: string }>;
};

type BudgetImportJsonRow = {
  id: number;
  row_number: number;
  parse_status: "valid" | "error";
  parse_errors: string[];
  payload: Record<string, unknown>;
};

type BudgetImportJsonPayload = {
  sheetName: string;
  columns: string[];
  rows: BudgetImportJsonRow[];
  audit: ImportAudit;
};

type BudgetSection = "Arquitectura" | "Comercial" | "Industrial";

type BudgetPreviewSaveRow = Record<string, unknown> & {
  fila_excel?: unknown;
  linea_original?: unknown;
  linea?: unknown;
  grupo?: unknown;
  negocio?: unknown;
};

type BudgetPreviewSaveInput = {
  fileName: string;
  importYear: number;
  sheetName: string;
  rowsBySection: Partial<Record<BudgetSection, BudgetPreviewSaveRow[]>>;
};

const BUDGET_COLUMNS = [
  "seccion",
  "negocio",
  "grupo",
  "linea_original",
  "linea",
  "enero_ventas",
  "enero_margen_bruto",
  "febrero_ventas",
  "febrero_margen_bruto",
  "marzo_ventas",
  "marzo_margen_bruto",
  "abril_ventas",
  "abril_margen_bruto",
  "mayo_ventas",
  "mayo_margen_bruto",
  "junio_ventas",
  "junio_margen_bruto",
  "julio_ventas",
  "julio_margen_bruto",
  "agosto_ventas",
  "agosto_margen_bruto",
  "setiembre_ventas",
  "setiembre_margen_bruto",
  "octubre_ventas",
  "octubre_margen_bruto",
  "noviembre_ventas",
  "noviembre_margen_bruto",
  "diciembre_ventas",
  "diciembre_margen_bruto",
] as const;

const BUDGET_MONTH_FIELDS = [
  { ventas: "enero_ventas", margenBruto: "enero_margen_bruto" },
  { ventas: "febrero_ventas", margenBruto: "febrero_margen_bruto" },
  { ventas: "marzo_ventas", margenBruto: "marzo_margen_bruto" },
  { ventas: "abril_ventas", margenBruto: "abril_margen_bruto" },
  { ventas: "mayo_ventas", margenBruto: "mayo_margen_bruto" },
  { ventas: "junio_ventas", margenBruto: "junio_margen_bruto" },
  { ventas: "julio_ventas", margenBruto: "julio_margen_bruto" },
  { ventas: "agosto_ventas", margenBruto: "agosto_margen_bruto" },
  { ventas: "setiembre_ventas", margenBruto: "setiembre_margen_bruto" },
  { ventas: "octubre_ventas", margenBruto: "octubre_margen_bruto" },
  { ventas: "noviembre_ventas", margenBruto: "noviembre_margen_bruto" },
  { ventas: "diciembre_ventas", margenBruto: "diciembre_margen_bruto" },
] as const;

function normalizeImportRecord(row: RecentBudgetImportRow): ImportRecord {
  return {
    ...row,
    uploaded_by_profile: row.profiles?.[0] ?? null,
  };
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getBudgetBusinessFromSection(section: BudgetSection) {
  if (section === "Arquitectura") return "Arquitectura";
  if (section === "Comercial") return "Geosinteticos";
  return "Industrial";
}

function getBudgetGroupFromSection(section: BudgetSection, value: unknown) {
  const normalized = toNullableString(value);
  if (normalized) return normalized;
  if (section === "Arquitectura") return "Arquitectura";
  if (section === "Comercial") return "Geoestructuras";
  return "Industrial";
}

function buildImportSourceRef(fileName: string, userId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");

  return `inline://budget/${userId}/${timestamp}-${normalizedFileName}`;
}

function buildImportData(parsed: Awaited<ReturnType<typeof parseBudgetWorkbook>>) {
  const rows = parsed.parsedRows.map((row) => ({
    id: row.rowNumber,
    row_number: row.rowNumber,
    parse_status: row.parseStatus,
    parse_errors: row.parseErrors,
    payload: row.payload,
  })) satisfies BudgetImportJsonRow[];

  return {
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    rows,
    audit: buildImportAudit({
      rows,
      getRowNumber: (row) => row.row_number,
      getPayload: (row) => row.payload,
      getParseStatus: (row) => row.parse_status,
      getParseErrors: (row) => row.parse_errors,
    }),
  } satisfies BudgetImportJsonPayload;
}

function buildPreviewRows(data: BudgetImportJsonPayload) {
  return data.rows.map((row) => ({
    fila_excel: row.row_number,
    parse_status: row.parse_status,
    ...row.payload,
  }));
}

function buildRowsBySectionPreview(
  parsed: Awaited<ReturnType<typeof parseBudgetWorkbook>>,
) {
  return {
    Arquitectura: parsed.rowsBySection.Arquitectura.map((row) => row.payload),
    Comercial: parsed.rowsBySection.Comercial.map((row) => row.payload),
    Industrial: parsed.rowsBySection.Industrial.map((row) => row.payload),
  };
}

export async function createBudgetImportFromUpload(
  file: File,
  currentUser: CurrentUser,
  importYear: number,
) {
  validateImportFile(file);
  importYearSchema.parse(importYear);

  const parsed = await parseBudgetWorkbook(file);
  const importData = buildImportData(parsed);

  console.groupCollapsed("[budget-imports][service] Excel de presupuesto leido");
  console.log("archivo", file.name);
  console.log("usuario", currentUser.id);
  console.log("anio_importacion", importYear);
  console.log("hoja", parsed.sheetName);
  console.log("columnas", parsed.columns);
  console.log("filas", importData.rows);
  console.log("total_filas", parsed.parsedRows.length);
  console.log("filas_validas", importData.audit.validRows);
  console.log("filas_con_error", importData.audit.invalidRows);
  console.groupEnd();

  return {
    fileName: file.name,
    importYear,
    sheetName: parsed.sheetName,
    columns: parsed.columns,
    previewRows: buildPreviewRows(importData),
    rowsBySection: buildRowsBySectionPreview(parsed),
    totalRows: importData.audit.totalRows,
    validRows: importData.audit.validRows,
    errorRows: importData.audit.invalidRows,
  };
}

function normalizeBudgetPreviewSaveRows(input: BudgetPreviewSaveInput) {
  const rows: BudgetImportJsonRow[] = [];

  for (const section of ["Arquitectura", "Comercial", "Industrial"] as const) {
    const sectionRows = input.rowsBySection[section] ?? [];

    for (const row of sectionRows) {
      const rowNumber = toNullableNumber(row.fila_excel);

      if (rowNumber === null) {
        throw new Error("No se pudo identificar la fila Excel de una linea de presupuesto.");
      }

      const monthlyPayload = Object.fromEntries(
        BUDGET_MONTH_FIELDS.flatMap((field) => [
          [field.ventas, row[field.ventas] ?? null],
          [field.margenBruto, row[field.margenBruto] ?? null],
        ]),
      );

      rows.push({
        id: rowNumber,
        row_number: rowNumber,
        parse_status: "valid",
        parse_errors: [],
        payload: {
          seccion: section,
          negocio: toNullableString(row.negocio) ?? getBudgetBusinessFromSection(section),
          grupo: getBudgetGroupFromSection(section, row.grupo),
          linea_original: row.linea_original ?? row.linea ?? null,
          linea: row.linea ?? row.linea_original ?? null,
          ...monthlyPayload,
        },
      });
    }
  }

  return rows;
}

export async function saveBudgetImportFromPreview(
  input: BudgetPreviewSaveInput,
  currentUser: CurrentUser,
) {
  const admin = createAdminSupabaseClient();
  importYearSchema.parse(input.importYear);
  const rows = normalizeBudgetPreviewSaveRows(input);
  const audit = buildImportAudit({
    rows,
    getRowNumber: (row) => row.row_number,
    getPayload: (row) => row.payload,
    getParseStatus: (row) => row.parse_status,
    getParseErrors: (row) => row.parse_errors,
  });
  const importData = {
    sheetName: input.sheetName,
    columns: [...BUDGET_COLUMNS],
    rows,
    audit,
  } satisfies BudgetImportJsonPayload;
  const storagePath = buildImportSourceRef(input.fileName, currentUser.id);

  const { data: importRow, error } = await admin
    .from("budget_imports")
    .insert({
      file_name: input.fileName,
      storage_path: storagePath,
      anio: input.importYear,
      uploaded_by: currentUser.id,
      status: "processed",
      total_rows: rows.length,
      valid_rows: audit.validRows,
      error_rows: audit.invalidRows,
      sheet_name: input.sheetName,
      notes: `Hoja ${input.sheetName}. Presupuesto guardado desde preview categorizado por seccion.`,
      data: importData,
    })
    .select("id")
    .single();

  if (error || !importRow) {
    console.error("[budget-imports][service] Error al guardar", error);
    throw new Error(error?.message ?? "No se pudo guardar la importacion de presupuesto.");
  }

  revalidatePath("/dashboard/imports");
  revalidatePath("/dashboard");
  revalidateDashboardDataCache();

  return {
    id: importRow.id as string,
    fileName: input.fileName,
    importYear: input.importYear,
    sheetName: input.sheetName,
    totalRows: rows.length,
    validRows: audit.validRows,
    errorRows: audit.invalidRows,
  };
}

export async function listRecentBudgetImports() {
  await requireRoleAccess([...importAccessRoles]);

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("budget_imports")
    .select(
      "id, file_name, storage_path, anio, uploaded_by, uploaded_at, status, total_rows, valid_rows, error_rows, notes, profiles!budget_imports_uploaded_by_fkey(full_name, email)",
    )
    .order("uploaded_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[budget-imports][service] Error al listar historial", error);
    return [];
  }

  return ((data ?? []) as unknown as RecentBudgetImportRow[]).map(normalizeImportRecord);
}

export async function deleteBudgetImport(importId: string) {
  await requireRoleAccess([...importAccessRoles]);

  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("budget_imports")
    .delete()
    .eq("id", importId);

  if (error) {
    throw new Error("No se pudo eliminar la importacion de presupuesto.");
  }

  revalidatePath("/dashboard/imports");
  revalidateDashboardDataCache();
}
