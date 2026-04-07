function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export { isRecord };

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

export function getPayloadYear(value: unknown) {
  const year = normalizeNumber(value);
  if (year === null) return null;

  const normalized = Math.trunc(year);
  return normalized >= 1900 && normalized <= 2100 ? normalized : null;
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

export function getPayloadVentasMonto(payload: Record<string, unknown>) {
  return normalizeNumber(payload.ventas_monto) ?? normalizeNumber(payload.observaciones);
}

export function getPayloadCliente(payload: Record<string, unknown>) {
  return (
    normalizeText(payload.cliente) ??
    normalizeText(payload.negocio) ??
    normalizeText(payload.ruc) ??
    normalizeText(payload.proyecto)
  );
}

export function getPayloadNegocio(payload: Record<string, unknown>) {
  return normalizeText(payload.negocio) ?? normalizeText(payload.sector);
}

export function getPayloadEjecutivo(payload: Record<string, unknown>) {
  return normalizeText(payload.ejecutivo);
}

export function getPayloadPipeline(payload: Record<string, unknown>) {
  return (
    normalizePipeline(payload.tipo_pipeline) ??
    normalizePipeline(payload.probabilidad_num) ??
    normalizePipeline(payload.pipeline)
  );
}

export function hasFacturacion(payload: Record<string, unknown>) {
  return (
    normalizeSituation(payload.situacion) === "facturado" ||
    normalizeText(payload.fecha_facturacion) !== null
  );
}
