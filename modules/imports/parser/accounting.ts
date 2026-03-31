import ExcelJS from "exceljs";

import { normalizeExcelCellValue } from "@/modules/imports/parser/ax-normalizer";

const ACCOUNTING_IMPORT_COLUMN_ORDER = [
  "linea",
  "anio_anterior_real",
  "anio_actual_ppto",
  "anio_actual_real",
  "mb",
] as const;

export interface ParsedAccountingRow {
  rowNumber: number;
  payload: Record<string, unknown>;
  parseStatus: "valid" | "error";
  parseErrors: string[];
}

export interface ParsedAccountingWorkbookPreview {
  sheetName: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  parsedRows: ParsedAccountingRow[];
}

function buildAccountingPayload(values: unknown[]) {
  return ACCOUNTING_IMPORT_COLUMN_ORDER.reduce<Record<string, unknown>>((acc, column, index) => {
    acc[column] = normalizeExcelCellValue(values[index]);
    return acc;
  }, {});
}

export async function parseAccountingWorkbook(file: File) {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("El archivo no contiene hojas de calculo.");
  }

  const parsedRows: ParsedAccountingRow[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (row.cellCount === 0) return;

    const values = (row.values as unknown[]).slice(1);
    const hasContent = values.some((value) => normalizeExcelCellValue(value) !== "");

    if (!hasContent) return;

    parsedRows.push({
      rowNumber,
      payload: buildAccountingPayload(values),
      parseStatus: "valid",
      parseErrors: [],
    });
  });

  console.groupCollapsed("[accounting-imports][parser] Excel recibido");
  console.log("archivo", file.name);
  console.log("hoja", worksheet.name);
  console.log("columnas_esperadas", ACCOUNTING_IMPORT_COLUMN_ORDER);
  console.log("total_filas_parseadas", parsedRows.length);
  console.log(
    "muestra_filas_parseadas",
    parsedRows.slice(0, 5).map((row) => ({
      rowNumber: row.rowNumber,
      parseStatus: row.parseStatus,
      parseErrors: row.parseErrors,
      payload: row.payload,
    })),
  );
  console.groupEnd();

  return {
    sheetName: worksheet.name,
    columns: [...ACCOUNTING_IMPORT_COLUMN_ORDER],
    previewRows: parsedRows.slice(0, 5).map((row) => row.payload),
    parsedRows,
  } satisfies ParsedAccountingWorkbookPreview;
}
