"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  PencilLine,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import type { ImportRecord } from "@/lib/types/database";
import { cn, formatDate } from "@/lib/utils";

const statusVariantMap = {
  pending: "warning",
  processing: "warning",
  processed: "success",
  failed: "destructive",
} as const;

const PREVIEW_PAGE_SIZE = 10;

interface UploadResponse {
  fileName: string;
  importYear: number | null;
  sheetName: string;
  columns: string[];
  previewRows: Record<string, unknown>[];
  rowsBelowSections?: Record<string, Record<string, unknown>[]>;
  monthlyRowsBySection?: Record<string, Record<string, unknown>[]>;
  totalRows: number;
  validRows: number;
  errorRows: number;
}

const MONTH_LABELS = [
  "",
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

const ACCOUNTING_MONTHLY_PREVIEW_COLUMNS = [
  { key: "negocio", label: "Negocio" },
  { key: "linea", label: "Línea" },
  { key: "enero_ventas", label: "Enero ventas" },
  { key: "enero_margen_bruto", label: "Enero margen bruto" },
  { key: "febrero_ventas", label: "Febrero ventas" },
  { key: "febrero_margen_bruto", label: "Febrero margen bruto" },
  { key: "marzo_ventas", label: "Marzo ventas" },
  { key: "marzo_margen_bruto", label: "Marzo margen bruto" },
  { key: "abril_ventas", label: "Abril ventas" },
  { key: "abril_margen_bruto", label: "Abril margen bruto" },
  { key: "mayo_ventas", label: "Mayo ventas" },
  { key: "mayo_margen_bruto", label: "Mayo margen bruto" },
  { key: "junio_ventas", label: "Junio ventas" },
  { key: "junio_margen_bruto", label: "Junio margen bruto" },
  { key: "julio_ventas", label: "Julio ventas" },
  { key: "julio_margen_bruto", label: "Julio margen bruto" },
  { key: "agosto_ventas", label: "Agosto ventas" },
  { key: "agosto_margen_bruto", label: "Agosto margen bruto" },
  { key: "setiembre_ventas", label: "Setiembre ventas" },
  { key: "setiembre_margen_bruto", label: "Setiembre margen bruto" },
  { key: "octubre_ventas", label: "Octubre ventas" },
  { key: "octubre_margen_bruto", label: "Octubre margen bruto" },
  { key: "noviembre_ventas", label: "Noviembre ventas" },
  { key: "noviembre_margen_bruto", label: "Noviembre margen bruto" },
  { key: "diciembre_ventas", label: "Diciembre ventas" },
  { key: "diciembre_margen_bruto", label: "Diciembre margen bruto" },
] as const;

const ACCOUNTING_GROUP_OPTIONS_BY_SECTION = {
  Comercial: [
    "Gaviones",
    "Geoestructuras",
    "Geomembranas",
    "Tuberias",
    "Otros - Geoestructuras",
  ],
  Industrial: [
    "Albergues",
    "Mangas",
    "Almacenes",
    "Otros - industrial",
  ],
} as const;

type AccountingSectionTitle = keyof typeof ACCOUNTING_GROUP_OPTIONS_BY_SECTION;

const DEFAULT_ACCOUNTING_GROUP_BY_SECTION = {
  Comercial: "Otros - Geoestructuras",
  Industrial: "Otros - industrial",
} as const satisfies Record<AccountingSectionTitle, string>;

const ACCOUNTING_BUSINESS_BY_SECTION = {
  Comercial: "Geosinteticos",
  Industrial: "Industrial",
} as const satisfies Record<AccountingSectionTitle, string>;

function buildAccountingGroupSelectionKey(
  section: AccountingSectionTitle,
  row: Record<string, unknown>,
) {
  return `${section}:${String(row.fila_excel ?? row.linea ?? "")}`;
}

function getDefaultAccountingGroup(section: AccountingSectionTitle) {
  return DEFAULT_ACCOUNTING_GROUP_BY_SECTION[section];
}

function getAccountingBusiness(section: AccountingSectionTitle) {
  return ACCOUNTING_BUSINESS_BY_SECTION[section];
}

function normalizePreviewColumnKey(header: string) {
  const normalized = header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const aliases: Record<string, string> = {
    ano: "anio",
    estado: "situacion",
    situacion: "situacion",
    mes: "mes",
    semana: "semana",
    "fecha registro": "fecha_registro",
    "fecha de registro": "fecha_registro",
    "fecha ingreso": "fecha_registro",
    "fecha de ingreso": "fecha_registro",
    "fecha adjudicacion": "fecha_adjudicacion",
    "fecha de adjudicacion": "fecha_adjudicacion",
    "fecha factura": "fecha_facturacion",
    "fecha facturacion": "fecha_facturacion",
    "fecha de facturacion": "fecha_facturacion",
    "orden venta": "orden_venta",
    "orden de venta": "orden_venta",
    factura: "factura",
    oc: "oc",
    "sector ax": "sector_ax",
    sector: "sector",
    ruc: "ruc",
    cliente: "cliente",
    negocio: "negocio",
    linea: "linea",
    sublinea: "sublinea",
    "sub linea": "sublinea",
    "sub-linea": "sublinea",
    grupo: "grupo",
    "nombre de proyecto": "proyecto",
    proyecto: "proyecto",
    codigo: "codigo_articulo",
    "codigo articulo": "codigo_articulo",
    articulo: "articulo",
    dimension1: "dimension1",
    dimension2: "dimension2",
    "dimension 3": "dimension3",
    dimension3: "dimension3",
    cantidad: "cantidad",
    um: "um",
    etapa: "etapa",
    "motivo perdida": "motivo_perdida",
    "bl / proy": "tipo_pipeline",
    "bl/proy": "tipo_pipeline",
    "tipo pipeline": "tipo_pipeline",
    pipeline: "pipeline",
    licitaciones: "licitacion_flag",
    licitacion: "licitacion_flag",
    probabilidad: "probabilidad_num",
    "ventas s/": "ventas_monto",
    "ventas s/.": "ventas_monto",
    ventas: "ventas_monto",
    proyeccion: "proyeccion_monto",
    costo: "costo_monto",
    margen: "margen_monto",
    porcentaje: "porcentaje_num",
    "ejecutivo de ventas": "ejecutivo",
    ejecutivo: "ejecutivo",
    observaciones: "observaciones",
  };

  return aliases[normalized] ?? normalized.replace(/\s+/g, "_");
}

function formatPreviewCell(value: unknown, columnKey?: string) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) return value.toISOString();
  if (
    columnKey === "mes" &&
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 12
  ) {
    return MONTH_LABELS[value] ?? String(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const normalizedDecimal = trimmed.replace(",", ".");

    if (/^-?\d+[,.]\d+$/.test(trimmed)) {
      const parsed = Number(normalizedDecimal);
      return Number.isFinite(parsed) ? parsed.toFixed(2) : trimmed;
    }

    return value;
  }
  if (
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return "";
}

function TopScrollSync({
  children,
  minWidthClassName,
}: {
  children: React.ReactNode;
  minWidthClassName?: string;
}) {
  const topRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [showTopScroll, setShowTopScroll] = useState(false);

  useEffect(() => {
    function syncMetrics() {
      const bottom = bottomRef.current;
      const content = contentRef.current;
      if (!bottom || !content) return;

      const nextWidth = content.scrollWidth;
      setContentWidth(nextWidth);
      setShowTopScroll(nextWidth > bottom.clientWidth);
    }

    syncMetrics();
    window.addEventListener("resize", syncMetrics);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncMetrics)
        : null;

    if (contentRef.current) resizeObserver?.observe(contentRef.current);
    if (bottomRef.current) resizeObserver?.observe(bottomRef.current);

    return () => {
      window.removeEventListener("resize", syncMetrics);
      resizeObserver?.disconnect();
    };
  }, []);

  function handleTopScroll() {
    if (!topRef.current || !bottomRef.current) return;
    bottomRef.current.scrollLeft = topRef.current.scrollLeft;
  }

  function handleBottomScroll() {
    if (!topRef.current || !bottomRef.current) return;
    topRef.current.scrollLeft = bottomRef.current.scrollLeft;
  }

  return (
    <div className="space-y-2">
      {showTopScroll ? (
        <div
          ref={topRef}
          className="overflow-x-auto rounded-lg border border-border bg-muted/20"
          onScroll={handleTopScroll}
        >
          <div style={{ width: contentWidth, height: 14 }} />
        </div>
      ) : null}
      <div
        ref={bottomRef}
        className="overflow-x-auto"
        onScroll={handleBottomScroll}
      >
        <div ref={contentRef} className={minWidthClassName}>
          {children}
        </div>
      </div>
    </div>
  );
}

function AccountingMonthlyPreviewTable({
  title,
  rows,
  groupSelections,
  onGroupChange,
}: {
  title: AccountingSectionTitle;
  rows: Record<string, unknown>[];
  groupSelections: Record<string, string>;
  onGroupChange: (
    section: AccountingSectionTitle,
    row: Record<string, unknown>,
    group: string,
  ) => void;
}) {
  const groupOptions = ACCOUNTING_GROUP_OPTIONS_BY_SECTION[title];

  return (
    <div className="space-y-3 rounded-3xl border border-border/70 bg-background/80 p-3 shadow-sm">
      <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {rows.length} filas detectadas debajo de {title}.
          </p>
        </div>
      </div>
      {rows.length ? (
        <TopScrollSync minWidthClassName="min-w-max">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="border-b">
                <th className="px-3 py-3 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                  Grupo
                </th>
                {ACCOUNTING_MONTHLY_PREVIEW_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className="px-3 py-3 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={`${title}-${rowIndex}`}
                  className="border-b align-top last:border-b-0 odd:bg-background even:bg-muted/10"
                >
                  <td className="px-3 py-3 text-xs leading-5 text-foreground align-top whitespace-nowrap">
                    <select
                      data-loading-overlay-ignore="true"
                      className="h-10 min-w-52 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      value={
                        groupSelections[
                          buildAccountingGroupSelectionKey(title, row)
                        ] ?? getDefaultAccountingGroup(title)
                      }
                      onChange={(event) =>
                        onGroupChange(title, row, event.target.value)
                      }
                    >
                      <option value="">Seleccionar grupo</option>
                      {groupOptions.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </td>
                  {ACCOUNTING_MONTHLY_PREVIEW_COLUMNS.map((column) => (
                    <td
                      key={`${title}-${rowIndex}-${column.key}`}
                      className="px-3 py-3 text-xs leading-5 text-foreground align-top whitespace-nowrap"
                    >
                      <div className="whitespace-pre-wrap">
                        {formatPreviewCell(row[column.key], column.key) || (
                          <span className="text-muted-foreground/60">-</span>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TopScrollSync>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No se detectaron filas para esta sección.
        </div>
      )}
    </div>
  );
}

function ImportUploadCard({
  title,
  eyebrow,
  description,
  templateHref,
  uploadEndpoint,
  templateLabel,
  successMessage,
  consoleLabel,
  accentClassName,
  showImportYear = true,
  businessOptions,
  periodOptions,
}: {
  title: string;
  eyebrow: string;
  description: string;
  templateHref?: string;
  uploadEndpoint: string;
  templateLabel?: string;
  successMessage: string;
  consoleLabel: string;
  accentClassName: string;
  showImportYear?: boolean;
  businessOptions?: ReadonlyArray<{ label: string; value: string }>;
  periodOptions?: ReadonlyArray<{ label: string; value: string }>;
}) {
  const router = useRouter();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState(String(new Date().getFullYear()));
  const [selectedBusiness, setSelectedBusiness] = useState(
    businessOptions?.[0]?.value ?? "",
  );
  const [selectedPeriodFrom, setSelectedPeriodFrom] = useState(
    periodOptions?.[0]?.value ?? "",
  );
  const [selectedPeriodTo, setSelectedPeriodTo] = useState(
    periodOptions?.[0]?.value ?? "",
  );
  const [preview, setPreview] = useState<UploadResponse | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isSavingAccounting, startSavingAccounting] = useTransition();
  const [accountingGroupSelections, setAccountingGroupSelections] = useState<
    Record<string, string>
  >({});

  const previewColumns = useMemo(() => {
    if (!preview) return [];

    const orderedColumns = preview.columns.map((column) => ({
      key: normalizePreviewColumnKey(column),
      label: column,
    }));
    const seen = new Set(orderedColumns.map((column) => column.key));

    for (const row of preview.previewRows) {
      for (const key of Object.keys(row)) {
        if (seen.has(key)) continue;
        seen.add(key);
        orderedColumns.push({
          key,
          label: key,
        });
      }
    }

    return orderedColumns;
  }, [preview]);

  const totalPreviewPages = useMemo(() => {
    if (!preview?.previewRows.length) return 1;
    return Math.ceil(preview.previewRows.length / PREVIEW_PAGE_SIZE);
  }, [preview]);

  const paginatedPreviewRows = useMemo(() => {
    if (!preview) return [];
    const start = (previewPage - 1) * PREVIEW_PAGE_SIZE;
    return preview.previewRows.slice(start, start + PREVIEW_PAGE_SIZE);
  }, [preview, previewPage]);
  const comercialMonthlyPreviewRows =
    preview?.monthlyRowsBySection?.Comercial ?? [];
  const industrialMonthlyPreviewRows =
    preview?.monthlyRowsBySection?.Industrial ?? [];
  const hasAccountingMonthlyPreview =
    Boolean(preview?.monthlyRowsBySection);
  const accountingMonthlyPreviewRows = [
    ...comercialMonthlyPreviewRows.map((row) => ({
      section: "Comercial" as const,
      row,
    })),
    ...industrialMonthlyPreviewRows.map((row) => ({
      section: "Industrial" as const,
      row,
    })),
  ];
  const accountingMonthlyPreviewRowCount = accountingMonthlyPreviewRows.length;
  const missingAccountingGroups = accountingMonthlyPreviewRows.filter(
    ({ section, row }) =>
      !(
        accountingGroupSelections[buildAccountingGroupSelectionKey(section, row)] ??
        getDefaultAccountingGroup(section)
      ),
  ).length;

  const previewRangeStart = preview?.previewRows.length
    ? (previewPage - 1) * PREVIEW_PAGE_SIZE + 1
    : 0;
  const previewRangeEnd = preview?.previewRows.length
    ? Math.min(previewPage * PREVIEW_PAGE_SIZE, preview.previewRows.length)
    : 0;

  function handleSubmit() {
    if (!file) {
      toast.error("Selecciona un archivo Excel antes de continuar.");
      return;
    }

    if (businessOptions && !selectedBusiness) {
      toast.error("Selecciona un negocio antes de continuar.");
      return;
    }

    if (periodOptions && (!selectedPeriodFrom || !selectedPeriodTo)) {
      toast.error("Selecciona un periodo antes de continuar.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        if (showImportYear) {
          formData.append("anio", importYear);
        }

        if (businessOptions) {
          formData.append("negocio", selectedBusiness);
        }
        if (periodOptions) {
          formData.append("periodo_desde", selectedPeriodFrom);
          formData.append("periodo_hasta", selectedPeriodTo);
        }

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as UploadResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo importar el archivo.");
        }

        console.groupCollapsed(consoleLabel);
        console.log("archivo", file.name);
        if (showImportYear) {
          console.log("anio", importYear);
        }
        if (businessOptions) {
          console.log("negocio", selectedBusiness);
        }
        if (periodOptions) {
          console.log("periodo_desde", selectedPeriodFrom);
          console.log("periodo_hasta", selectedPeriodTo);
        }
        console.log("payload", payload);
        console.log("columnas", payload.columns);
        console.log(
          "primeras_10_filas_leidas",
          payload.previewRows.slice(0, 10),
        );
        if (payload.rowsBelowSections) {
          console.log(
            "filas_debajo_de_comercial",
            payload.rowsBelowSections.Comercial ?? [],
          );
          console.table(payload.rowsBelowSections.Comercial ?? []);
          console.log(
            "filas_debajo_de_industrial",
            payload.rowsBelowSections.Industrial ?? [],
          );
          console.table(payload.rowsBelowSections.Industrial ?? []);
        }
        if (payload.monthlyRowsBySection) {
          console.log(
            "filas_mensuales_comercial",
            payload.monthlyRowsBySection.Comercial ?? [],
          );
          console.table(payload.monthlyRowsBySection.Comercial ?? []);
          console.log(
            "filas_mensuales_industrial",
            payload.monthlyRowsBySection.Industrial ?? [],
          );
          console.table(payload.monthlyRowsBySection.Industrial ?? []);
        }
        console.table(payload.previewRows.slice(0, 10));
        console.table(payload.previewRows);
        console.groupEnd();

        setPreview(payload);
        setAccountingGroupSelections({});
        setPreviewPage(1);
        router.refresh();
        toast.success(successMessage);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error durante la importación.",
        );
      }
    });
  }

  function handleAccountingGroupChange(
    section: AccountingSectionTitle,
    row: Record<string, unknown>,
    group: string,
  ) {
    setAccountingGroupSelections((current) => ({
      ...current,
      [buildAccountingGroupSelectionKey(section, row)]: group,
    }));
  }

  function buildRowsWithAccountingGroups(
    section: AccountingSectionTitle,
    rows: Record<string, unknown>[],
  ) {
    return rows.map((row) => ({
      ...row,
      negocio: getAccountingBusiness(section),
      grupo: accountingGroupSelections[
        buildAccountingGroupSelectionKey(section, row)
      ] ?? getDefaultAccountingGroup(section),
    }));
  }

  function handleSaveAccountingPreview() {
    if (!preview?.monthlyRowsBySection) return;

    if (accountingMonthlyPreviewRowCount === 0) {
      toast.error("No hay filas contables para guardar.");
      return;
    }

    if (typeof preview.importYear !== "number") {
      toast.error("El año de carga no es valido.");
      return;
    }

    if (missingAccountingGroups > 0) {
      toast.error("Selecciona un grupo para cada fila antes de guardar.");
      return;
    }

    startSavingAccounting(async () => {
      try {
        const response = await fetch(uploadEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fileName: preview.fileName,
            importYear: preview.importYear,
            sheetName: preview.sheetName,
            monthlyRowsBySection: {
              Comercial: buildRowsWithAccountingGroups(
                "Comercial",
                comercialMonthlyPreviewRows,
              ),
              Industrial: buildRowsWithAccountingGroups(
                "Industrial",
                industrialMonthlyPreviewRows,
              ),
            },
          }),
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudo guardar la contabilidad.");
        }

        router.refresh();
        toast.success("Importación contable guardada.");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo guardar la contabilidad.",
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1 w-full", accentClassName)} />
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              {eyebrow}
            </p>
            <CardTitle className="mt-2">{title}</CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {templateHref && templateLabel ? (
            <Link
              href={templateHref}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-border/70 bg-background/80 px-6 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:bg-background sm:w-auto sm:min-w-[240px]",
              )}
            >
              <Download className="size-4" />
              {templateLabel}
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showImportYear ? (
          <div className="space-y-2">
            <Label>Año de carga</Label>
            <Input
              type="number"
              min={2020}
              max={2100}
              value={importYear}
              onChange={(event) => setImportYear(event.target.value)}
            />
          </div>
        ) : null}

        {businessOptions ? (
          <div className="space-y-2">
            <Label>Tipo de negocio</Label>
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              value={selectedBusiness}
              onChange={(event) => setSelectedBusiness(event.target.value)}
            >
              {businessOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {periodOptions ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Periodo desde</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedPeriodFrom}
                onChange={(event) => setSelectedPeriodFrom(event.target.value)}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Periodo hasta</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedPeriodTo}
                onChange={(event) => setSelectedPeriodTo(event.target.value)}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-border/70 bg-muted/20 p-4">
          <input
            id={fileInputId}
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Archivo de importación
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                Formato soportado actualmente: `.xlsx`. Selecciona el archivo y luego procesa la carga.
              </p>
              <div className="inline-flex min-h-9 max-w-full items-center rounded-2xl border border-dashed border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm">
                <span className="truncate">
                  {file ? file.name : "Ningún archivo seleccionado"}
                </span>
              </div>
            </div>
            <Button
              type="button"
          
              className="h-11 rounded-2xl border-border/70 bg-background px-4 shadow-sm"
              onClick={() => document.getElementById(fileInputId)?.click()}
            >
              <UploadCloud className="size-4" />
              {file ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isPending || !file}
          className="h-12 w-full rounded-2xl bg-[linear-gradient(90deg,#0f172a_0%,#1d4f91_100%)] text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.28)] disabled:translate-y-0 disabled:shadow-none"
        >
          {isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          Procesar importación
        </Button>

        {preview ? (
          <div className="rounded-3xl border border-border/70 bg-muted/30 p-5">
            <div className="space-y-1">
              <p className="text-sm font-medium">Resumen de la última carga</p>
              <p className="text-xs text-muted-foreground">
                La tabla inferior muestra el payload tal como entra desde el Excel.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Archivo
                </p>
                <p className="mt-2 text-sm font-medium">{preview.fileName}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Año
                </p>
                <p className="mt-2 text-sm font-medium">{preview.importYear}</p>
              </div>
              <div className="rounded-2xl border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Hoja
                </p>
                <p className="mt-2 text-sm font-medium">{preview.sheetName}</p>
              </div>
              {businessOptions ? (
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Negocio
                  </p>
                  <p className="mt-2 text-sm font-medium">{selectedBusiness}</p>
                </div>
              ) : null}
              {periodOptions ? (
                <div className="rounded-2xl border bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Periodo
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {selectedPeriodFrom === selectedPeriodTo
                      ? selectedPeriodFrom
                      : `${selectedPeriodFrom} a ${selectedPeriodTo}`}
                  </p>
                </div>
              ) : null}
              <div className="rounded-2xl border bg-background/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Total filas
                </p>
                <p className="mt-2 text-sm font-medium">{preview.totalRows}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                  Válidas
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-900">
                  {preview.validRows}
                </p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-rose-700">
                  Con error
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-900">
                  {preview.errorRows}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-3 border-t pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="font-medium">Preview del payload</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview?.monthlyRowsBySection
                  ? "Se muestran las líneas de Comercial e Industrial con ventas y margen bruto por mes."
                  : "Se muestran las filas tal como llegan del Excel. Los valores nulos se ven en blanco."}
              </p>
            </div>
            {hasAccountingMonthlyPreview ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>Comercial: {comercialMonthlyPreviewRows.length} filas</span>
                <span className="hidden sm:inline">|</span>
                <span>Industrial: {industrialMonthlyPreviewRows.length} filas</span>
                <span className="hidden sm:inline">|</span>
                <span>{ACCOUNTING_MONTHLY_PREVIEW_COLUMNS.length} columnas visibles</span>
              </div>
            ) : preview?.previewRows.length ? (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  Mostrando {previewRangeStart}-{previewRangeEnd} de {preview.previewRows.length}
                </span>
                <span className="hidden sm:inline">|</span>
                <span>{previewColumns.length} columnas detectadas</span>
              </div>
            ) : null}
          </div>

          {hasAccountingMonthlyPreview ? (
            <div className="space-y-4">
              <AccountingMonthlyPreviewTable
                title="Comercial"
                rows={comercialMonthlyPreviewRows}
                groupSelections={accountingGroupSelections}
                onGroupChange={handleAccountingGroupChange}
              />
              <AccountingMonthlyPreviewTable
                title="Industrial"
                rows={industrialMonthlyPreviewRows}
                groupSelections={accountingGroupSelections}
                onGroupChange={handleAccountingGroupChange}
              />
              <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {missingAccountingGroups > 0
                    ? `Faltan ${missingAccountingGroups} grupos por seleccionar.`
                    : "Todas las filas tienen grupo asignado."}
                </p>
                <Button
                  type="button"
                  className="h-11 rounded-2xl bg-slate-900 px-5 text-white hover:bg-slate-800"
                  disabled={
                    isSavingAccounting ||
                    accountingMonthlyPreviewRowCount === 0 ||
                    missingAccountingGroups > 0
                  }
                  onClick={handleSaveAccountingPreview}
                >
                  {isSavingAccounting ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                  Guardar contabilidad
                </Button>
              </div>
            </div>
          ) : preview?.previewRows.length ? (
            <div className="space-y-3 rounded-3xl border border-border/70 bg-background/80 p-3 shadow-sm">
              <TopScrollSync minWidthClassName="min-w-max">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr className="border-b">
                      {previewColumns.map((column) => (
                        <th
                          key={column.key}
                          className="px-3 py-3 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPreviewRows.map((row, index) => (
                      <tr
                        key={`${previewPage}-${index}`}
                        className="border-b align-top last:border-b-0 odd:bg-background even:bg-muted/10"
                      >
                        {previewColumns.map((column) => (
                          <td
                            key={`${previewPage}-${index}-${column.key}`}
                            className="px-3 py-3 text-xs leading-5 text-foreground align-top whitespace-nowrap"
                          >
                            <div className="whitespace-pre-wrap">
                              {formatPreviewCell(row[column.key], column.key) || (
                                <span className="text-muted-foreground/60">-</span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TopScrollSync>

              <div className="flex flex-col gap-3 border-t px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Navega en bloques de {PREVIEW_PAGE_SIZE} filas para revisar el parseo con menos ruido visual.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setPreviewPage((current) => Math.max(1, current - 1))}
                    disabled={previewPage === 1}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                  <div className="min-w-28 text-center text-sm text-muted-foreground">
                    Página {previewPage} de {totalPreviewPages}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      setPreviewPage((current) => Math.min(totalPreviewPages, current + 1))
                    }
                    disabled={previewPage === totalPreviewPages}
                  >
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              Aún no hay preview. Sube un archivo para validar columnas y ver el muestreo inicial.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ImportHistoryCard({
  title,
  imports,
  deleteEndpointBase,
  emptyLabel,
  editBasePath,
  showYearColumn = true,
}: {
  title: string;
  imports: ImportRecord[];
  deleteEndpointBase: string;
  emptyLabel: string;
  editBasePath?: string;
  showYearColumn?: boolean;
}) {
  const router = useRouter();
  const [deletingImportId, setDeletingImportId] = useState<string | null>(null);

  async function handleDeleteImport(importId: string) {
    const confirmed = window.confirm(
      "Se eliminará la importación completa. Esta acción no se puede deshacer.",
    );

    if (!confirmed) return;

    try {
      setDeletingImportId(importId);

      const response = await fetch(`${deleteEndpointBase}/${importId}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo eliminar la importación.");
      }

      router.refresh();
      toast.success("Importación eliminada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar la importación.",
      );
    } finally {
      setDeletingImportId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={showYearColumn ? undefined : "[&_th:nth-child(2)]:hidden [&_td:nth-child(2)]:hidden"}>
          <TopScrollSync minWidthClassName="min-w-[980px]">
            <Table>
              <TableElement>
              <TableHead>
                <tr>
                  <TableHeaderCell>Archivo</TableHeaderCell>
                  <TableHeaderCell>Año</TableHeaderCell>
                  <TableHeaderCell>Usuario</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Filas</TableHeaderCell>
                  <TableHeaderCell>Válidas</TableHeaderCell>
                  <TableHeaderCell>Errores</TableHeaderCell>
                  <TableHeaderCell className="text-right">Acciones</TableHeaderCell>
                </tr>
              </TableHead>
                <TableBody>
                {imports.length ? (
                  imports.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.file_name}</TableCell>
                      <TableCell>{showYearColumn ? item.anio ?? "-" : null}</TableCell>
                      <TableCell>
                        {item.uploaded_by_profile?.full_name ??
                          item.uploaded_by_profile?.email ??
                          item.uploaded_by}
                      </TableCell>
                      <TableCell>{formatDate(item.uploaded_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[item.status]}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.total_rows}</TableCell>
                      <TableCell>{item.valid_rows}</TableCell>
                      <TableCell>{item.error_rows}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editBasePath ? (
                            <Link href={`${editBasePath}/${item.id}`}>
                              <Button
                                size="sm"
                                className="border border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                              >
                                <PencilLine className="size-4" />
                                Editar
                              </Button>
                            </Link>
                          ) : null}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteImport(item.id)}
                            disabled={deletingImportId === item.id}
                          >
                            {deletingImportId === item.id ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Borrar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      {emptyLabel}
                    </td>
                  </tr>
                )}
                </TableBody>
              </TableElement>
            </Table>
          </TopScrollSync>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportsPageView({
  imports,
  accountingImports,
}: {
  imports: ImportRecord[];
  accountingImports: ImportRecord[];
}) {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Centro de importaciones
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Flujo de carga
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Gestiona dos cargas independientes: AX comercial se conserva para auditoría, y contabilidad queda en modo revisión para leer el Excel y revisar marcas desde consola.
          </p>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-2">
        <ImportUploadCard
          title="Subir Excel de AX"
          eyebrow="Cargas AX"
          description="Carga comercial principal. El archivo se procesa por posición, se conserva tal como llega y queda disponible para edición y dashboards comerciales."
          templateHref="/api/imports/template"
          uploadEndpoint="/api/imports"
          templateLabel="Descargar plantilla AX"
          successMessage="Importación AX procesada correctamente."
          consoleLabel="[imports] Excel AX cargado"
          accentClassName="bg-[linear-gradient(90deg,#0b1f33_0%,#1f5c8c_100%)]"
          showImportYear={false}
        />
        <ImportUploadCard
          title="Subir Excel de contabilidad"
          eyebrow="Cargas contables"
          description="Carga contable temporal para revisar el archivo completo: lee todas las filas y marca cuando la columna A coincide con 1. TENSOESTRUCTURA, Geosinteticos o Industrial."
          uploadEndpoint="/api/accounting-imports"
          successMessage="Excel contable leído correctamente. Revisa la consola para ver las filas."
          consoleLabel="[accounting-imports] Excel cargado"
          accentClassName="bg-[linear-gradient(90deg,#17456d_0%,#2d7f73_100%)]"
        />
      </div>

      <div className="grid gap-6">
        <ImportHistoryCard
          title="Historial reciente AX"
          imports={imports}
          deleteEndpointBase="/api/imports"
          editBasePath="/dashboard/imports"
          emptyLabel="No hay importaciones AX registradas todavía."
          showYearColumn={false}
        />
        <ImportHistoryCard
          title="Historial reciente contabilidad"
          imports={accountingImports}
          deleteEndpointBase="/api/accounting-imports"
          editBasePath="/dashboard/imports/contabilidad"
          emptyLabel="No hay importaciones contables registradas todavía."
        />
      </div>
    </div>
  );
}
