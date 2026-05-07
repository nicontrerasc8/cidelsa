import ExcelJS from "exceljs";

import { normalizeExcelCellValue } from "@/modules/imports/parser/ax-normalizer";

const BUDGET_SECTION_MARKERS = {
  ARQUITECTURA: "Arquitectura",
  COMERCIAL: "Comercial",
  GEOSINTETICOS: "Comercial",
  INDUSTRIAL: "Industrial",
} as const;

const BUDGET_TOTAL_MARKERS = {
  "TOTAL ARQUITECTURA": "Arquitectura",
  "TOTAL GEOSINTETICOS": "Comercial",
  "TOTAL COMERCIAL": "Comercial",
  "TOTAL INDUSTRIAL": "Industrial",
} as const;

const MONTH_COLUMN_PAIRS = [
  { mes: "enero", ventas: "columna_b", margenBruto: "columna_c" },
  { mes: "febrero", ventas: "columna_d", margenBruto: "columna_e" },
  { mes: "marzo", ventas: "columna_f", margenBruto: "columna_g" },
  { mes: "abril", ventas: "columna_h", margenBruto: "columna_i" },
  { mes: "mayo", ventas: "columna_j", margenBruto: "columna_k" },
  { mes: "junio", ventas: "columna_l", margenBruto: "columna_m" },
  { mes: "julio", ventas: "columna_n", margenBruto: "columna_o" },
  { mes: "agosto", ventas: "columna_p", margenBruto: "columna_q" },
  { mes: "setiembre", ventas: "columna_r", margenBruto: "columna_s" },
  { mes: "octubre", ventas: "columna_t", margenBruto: "columna_u" },
  { mes: "noviembre", ventas: "columna_v", margenBruto: "columna_w" },
  { mes: "diciembre", ventas: "columna_x", margenBruto: "columna_y" },
] as const;

const LAST_BUDGET_COLUMN_NUMBER = 25;

export type BudgetSection = "Arquitectura" | "Comercial" | "Industrial";

export type ParsedBudgetRow = {
  rowNumber: number;
  section: BudgetSection;
  payload: Record<string, unknown>;
  parseStatus: "valid" | "error";
  parseErrors: string[];
};

export interface ParsedBudgetWorkbookPreview {
  sheetName: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  parsedRows: ParsedBudgetRow[];
  rowsBySection: Record<BudgetSection, ParsedBudgetRow[]>;
}

function getExcelColumnName(columnNumber: number) {
  let current = columnNumber;
  let columnName = "";

  while (current > 0) {
    const modulo = (current - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    current = Math.floor((current - modulo) / 26);
  }

  return columnName;
}

function getColumnKey(columnNumber: number) {
  return `columna_${getExcelColumnName(columnNumber).toLowerCase()}`;
}

function normalizeBudgetMarker(value: unknown) {
  if (typeof value !== "string") return null;

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function getSectionMarker(value: unknown) {
  const normalized = normalizeBudgetMarker(value);
  if (!normalized) return null;

  return (
    BUDGET_SECTION_MARKERS[
      normalized as keyof typeof BUDGET_SECTION_MARKERS
    ] ?? null
  );
}

function getTotalMarker(value: unknown) {
  const normalized = normalizeBudgetMarker(value);
  if (!normalized) return null;

  return (
    BUDGET_TOTAL_MARKERS[normalized as keyof typeof BUDGET_TOTAL_MARKERS] ??
    null
  );
}

function getRowValues(row: ExcelJS.Row) {
  const rawValues = row.values as unknown[];
  const highestColumnNumber = Math.min(
    Math.max(rawValues.length - 1, row.cellCount),
    LAST_BUDGET_COLUMN_NUMBER,
  );

  return Array.from({ length: highestColumnNumber }, (_, index) =>
    normalizeExcelCellValue(rawValues[index + 1]),
  );
}

function buildRawPayload(values: unknown[]) {
  return values.reduce<Record<string, unknown>>((acc, value, index) => {
    acc[getColumnKey(index + 1)] = value;
    return acc;
  }, {});
}

function buildBudgetPayload(
  section: BudgetSection,
  rowNumber: number,
  rawPayload: Record<string, unknown>,
) {
  const payload: Record<string, unknown> = {
    fila_excel: rowNumber,
    seccion: section,
    linea_original: rawPayload.columna_a,
    linea: rawPayload.columna_a,
  };

  for (const month of MONTH_COLUMN_PAIRS) {
    payload[`${month.mes}_ventas`] = rawPayload[month.ventas] ?? null;
    payload[`${month.mes}_margen_bruto`] = rawPayload[month.margenBruto] ?? null;
  }

  return payload;
}

export async function parseBudgetWorkbook(file: File) {
  const workbook = new ExcelJS.Workbook();
  const buffer = Buffer.from(await file.arrayBuffer());

  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error("El archivo no contiene hojas de calculo.");
  }

  const parsedRows: ParsedBudgetRow[] = [];
  const rowsBySection: Record<BudgetSection, ParsedBudgetRow[]> = {
    Arquitectura: [],
    Comercial: [],
    Industrial: [],
  };
  let activeSection: BudgetSection | null = null;

  worksheet.eachRow((row, rowNumber) => {
    if (row.cellCount === 0) return;

    const rawPayload = buildRawPayload(getRowValues(row));
    const columnA = rawPayload.columna_a;
    const sectionMarker = getSectionMarker(columnA);
    const totalMarker = getTotalMarker(columnA);

    if (sectionMarker) {
      activeSection = sectionMarker;
      return;
    }

    if (totalMarker && totalMarker === activeSection) {
      activeSection = null;
      return;
    }

    if (!activeSection) return;

    const lineName = typeof columnA === "string" ? columnA.trim() : columnA;
    if (!lineName) return;
    if (normalizeBudgetMarker(lineName) === "NOMBRE") return;

    const parsedRow: ParsedBudgetRow = {
      rowNumber,
      section: activeSection,
      payload: buildBudgetPayload(activeSection, rowNumber, rawPayload),
      parseStatus: "valid",
      parseErrors: [],
    };

    parsedRows.push(parsedRow);
    rowsBySection[activeSection].push(parsedRow);
  });

  const columns = [
    "fila_excel",
    "seccion",
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
  ];

  console.groupCollapsed("[budget-imports][parser] Excel de presupuesto recibido");
  console.log("archivo", file.name);
  console.log("hoja", worksheet.name);
  console.log("filas_arquitectura", rowsBySection.Arquitectura);
  console.table(rowsBySection.Arquitectura.map((row) => row.payload));
  console.log("filas_comercial_geosinteticos", rowsBySection.Comercial);
  console.table(rowsBySection.Comercial.map((row) => row.payload));
  console.log("filas_industrial", rowsBySection.Industrial);
  console.table(rowsBySection.Industrial.map((row) => row.payload));
  console.groupEnd();

  return {
    sheetName: worksheet.name,
    columns,
    previewRows: parsedRows.map((row) => row.payload),
    parsedRows,
    rowsBySection,
  } satisfies ParsedBudgetWorkbookPreview;
}
