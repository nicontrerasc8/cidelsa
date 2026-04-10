import ExcelJS from "exceljs";

import {
  buildPayloadFromRow,
  normalizeAxRow,
  normalizeExcelCellValue,
  type ParsedAxRow,
} from "@/modules/imports/parser/ax-normalizer";

const AX_IMPORT_COLUMN_ORDER = [
  "anio",
  "situacion",
  "mes",
  "orden_venta",
  "fecha_registro",
  "factura",
  "fecha_facturacion",
  "oc",
  "sector",
  "ruc",
  "cliente",
  "negocio",
  "linea",
  "sublinea",
  "grupo",
  "codigo_articulo",
  "articulo",
  "dimension1",
  "dimension2",
  "dimension3",
  "cantidad",
  "um",
  "ventas_monto",
  "ejecutivo",
  "observaciones",
] as const;

function getWorksheetHeaders(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  const headers = (headerRow.values as unknown[]).slice(1).map((value) => {
    const normalized = normalizeExcelCellValue(value);
    return typeof normalized === "string" ? normalized.trim() : "";
  });

  const hasNamedHeaders = headers.some((header) => header.length > 0);
  return hasNamedHeaders ? headers : [...AX_IMPORT_COLUMN_ORDER];
}

export interface ParsedWorkbookPreview {
  sheetName: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  parsedRows: ParsedAxRow[];
}

export async function parseAxWorkbook(file: File) {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("El archivo no contiene hojas de calculo.");
  }

  const parsedRows: ParsedAxRow[] = [];
  const headers = getWorksheetHeaders(worksheet);

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (row.cellCount === 0) return;

    const values = (row.values as unknown[]).slice(1);
    const hasContent = values.some((value) => normalizeExcelCellValue(value) !== "");

    if (!hasContent) return;

    const payload = buildPayloadFromRow(headers, values);
    parsedRows.push(normalizeAxRow(rowNumber, payload));
  });

  console.groupCollapsed("[imports][parser] Excel recibido");
  console.log("archivo", file.name);
  console.log("hoja", worksheet.name);
  console.log("columnas_detectadas", headers);
  console.log("total_filas_parseadas", parsedRows.length);
  console.log(
    "filas_con_error",
    parsedRows.filter((row) => row.parseStatus === "error").map((row) => ({
      rowNumber: row.rowNumber,
      parseErrors: row.parseErrors,
      payload: row.payload,
    })),
  );
  console.log(
    "muestra_filas_crudas",
    parsedRows.slice(0, 5).map((row) => ({
      rowNumber: row.rowNumber,
      payload: row.payload,
    })),
  );
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
    columns: headers,
    previewRows: parsedRows.slice(0, 5).map((row) => row.payload),
    parsedRows,
  } satisfies ParsedWorkbookPreview;
}
