import ExcelJS from "exceljs";

import {
  buildPayloadFromRow,
  normalizeAxRow,
  normalizeExcelCellValue,
  type ParsedAxRow,
} from "@/modules/imports/parser/ax-normalizer";

const AX_IMPORT_COLUMN_ORDER = [
  "situacion",
  "mes",
  "semana",
  "orden_venta",
  "fecha_registro",
  "fecha_adjudicacion",
  "factura",
  "fecha_facturacion",
  "oc",
  "sector",
  "ruc",
  "cliente",
  "negocio",
  "linea",
  "proyecto",
  "codigo_articulo",
  "articulo",
  "dimension1",
  "dimension2",
  "dimension3",
  "cantidad",
  "um",
  "etapa",
  "motivo_perdida",
  "tipo_pipeline",
  "pipeline",
  "licitacion_flag",
  "probabilidad_num",
  "ventas_monto",
  "proyeccion_monto",
  "ejecutivo",
  "observaciones",
] as const;

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

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (row.cellCount === 0) return;

    const values = (row.values as unknown[]).slice(1);
    const hasContent = values.some((value) => normalizeExcelCellValue(value) !== "");

    if (!hasContent) return;

    const payload = buildPayloadFromRow([...AX_IMPORT_COLUMN_ORDER], values);
    parsedRows.push(normalizeAxRow(rowNumber, payload));
  });

  console.groupCollapsed("[imports][parser] Excel recibido");
  console.log("archivo", file.name);
  console.log("hoja", worksheet.name);
  console.log("columnas_esperadas", AX_IMPORT_COLUMN_ORDER);
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
    columns: [...AX_IMPORT_COLUMN_ORDER],
    previewRows: parsedRows.slice(0, 5).map((row) => row.payload),
    parsedRows,
  } satisfies ParsedWorkbookPreview;
}
