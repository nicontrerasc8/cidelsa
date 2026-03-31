export interface ParsedAxRow {
  rowNumber: number;
  payload: Record<string, unknown>;
  parseStatus: "valid" | "error";
  parseErrors: string[];
}

const HEADER_ALIASES: Record<string, string> = {
  situacion: "situacion",
  mes: "mes",
  semana: "semana",
  "fecha registro": "fecha_registro",
  "fecha de registro": "fecha_registro",
  "fecha adjudicacion": "fecha_adjudicacion",
  "fecha de adjudicacion": "fecha_adjudicacion",
  "fecha facturacion": "fecha_facturacion",
  "fecha de facturacion": "fecha_facturacion",
  "orden venta": "orden_venta",
  "orden de venta": "orden_venta",
  factura: "factura",
  oc: "oc",
  cliente: "cliente",
  ruc: "ruc",
  sector: "sector",
  negocio: "negocio",
  linea: "linea",
  proyecto: "proyecto",
  "nombre de proyecto": "proyecto",
  "codigo articulo": "codigo_articulo",
  codigo: "codigo_articulo",
  articulo: "articulo",
  dimension1: "dimension1",
  dimension2: "dimension2",
  "dimension 3": "dimension3",
  dimension3: "dimension3",
  cantidad: "cantidad",
  um: "um",
  etapa: "etapa",
  "motivo perdida": "motivo_perdida",
  "tipo pipeline": "tipo_pipeline",
  "bl / proy": "tipo_pipeline",
  "bl/proy": "tipo_pipeline",
  pipeline: "pipeline",
  licitacion: "licitacion_flag",
  licitaciones: "licitacion_flag",
  probabilidad: "probabilidad_num",
  ventas: "ventas_monto",
  "ventas s/": "ventas_monto",
  "ventas s/.": "ventas_monto",
  proyeccion: "proyeccion_monto",
  ejecutivo: "ejecutivo",
  "ejecutivo de ventas": "ejecutivo",
  observaciones: "observaciones",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeExcelCellValue(value: unknown): unknown {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (!isRecord(value)) return "";

  if (Array.isArray(value.richText)) {
    const text = value.richText
      .map((item) => (isRecord(item) && typeof item.text === "string" ? item.text : ""))
      .join("")
      .trim();

    return text || "";
  }

  if ("result" in value) {
    return normalizeExcelCellValue(value.result);
  }

  if (typeof value.text === "string") {
    return value.text.trim();
  }

  return "";
}

function normalizeHeader(header: string) {
  const key = header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return HEADER_ALIASES[key] ?? key.replace(/\s+/g, "_");
}

export function buildPayloadFromRow(headers: string[], values: unknown[]) {
  return headers.reduce<Record<string, unknown>>((acc, header, index) => {
    acc[normalizeHeader(header)] = normalizeExcelCellValue(values[index]);
    return acc;
  }, {});
}

export function normalizeAxRow(
  rowNumber: number,
  payload: Record<string, unknown>,
): ParsedAxRow {
  return {
    rowNumber,
    payload,
    parseStatus: "valid",
    parseErrors: [],
  };
}
