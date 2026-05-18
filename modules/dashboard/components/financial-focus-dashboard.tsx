"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calculator,
  CircleDollarSign,
  Filter,
  LayoutDashboard,
  Scale,
  Target,
  TrendingUp,
} from "lucide-react";

import type { FinancialSummary } from "@/modules/dashboard/services/financial-dashboards";

const ALL_VALUE = "__all__";
const MONTH_ORDER = [
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
  "Anual",
] as const;
const CHART_COLORS = [
  "#38bdf8",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#f43f5e",
  "#22d3ee",
  "#a3e635",
  "#fb7185",
] as const;
const ACCOUNTING_BUDGET_DISPLAY_DIVISOR = 1000;

type DashboardMode = "accounting" | "accounting-budget" | "budget" | "comparison";
type SummaryRow = FinancialSummary["rows"][number];
type Totals = {
  previous: number;
  planned: number;
  actual: number;
  grossMargin: number;
  lineCount: number;
};
type MetricRow = {
  name: string;
  previous: number;
  planned: number;
  actual: number;
  grossMargin: number;
  lineCount: number;
  variance: number;
  achievement: number | null;
  marginPct: number | null;
};
type LineLabelProps = {
  x?: number | string;
  y?: number | string;
  index?: number;
  value?: number | string;
  fill?: string;
  labelCount?: number;
};
type BarLabelProps = {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
};

function formatCompactCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatFullCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function formatChartCurrencyLabel(value: unknown) {
  if (typeof value !== "number" || value === 0) return "";

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000) {
    const millions = new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 3,
    }).format(absValue / 1_000_000);

    return `${sign}S/\u00a0${millions}\u00a0M`;
  }

  return formatCompactCurrency(value);
}

function formatChartPercentLabel(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? formatPercent(value) : "";
}

function AdaptiveLineLabel({
  x,
  y,
  index = 0,
  value,
  fill = "#7dd3fc",
  labelCount = 0,
}: LineLabelProps) {
  const label = formatChartPercentLabel(value);
  const labelX = Number(x);
  const labelY = Number(y);

  if (!label || !Number.isFinite(labelX) || !Number.isFinite(labelY)) return null;

  const isFirst = index === 0;
  const isLast = labelCount > 0 && index === labelCount - 1;
  const putBelow = labelY < 34 || index % 2 === 1;
  const textX = labelX + (isLast ? -8 : isFirst || index % 2 === 0 ? 8 : -8);
  const textY = labelY + (putBelow ? 18 : -12);
  const textAnchor = isLast || (!isFirst && index % 2 === 1) ? "end" : "start";
  const backgroundWidth = Math.max(38, label.length * 7.4);
  const backgroundX =
    textAnchor === "end" ? textX - backgroundWidth - 4 : textX - 4;

  return (
    <g>
      <rect
        x={backgroundX}
        y={textY - 13}
        width={backgroundWidth}
        height={18}
        rx={7}
        fill="#05080f"
        opacity={0.82}
      />
      <text
        x={textX}
        y={textY}
        textAnchor={textAnchor}
        fill={fill}
        fontSize={12}
        fontWeight={800}
      >
        {label}
      </text>
    </g>
  );
}

function BarValueLabel({ x, y, width, height, value }: BarLabelProps) {
  const label = formatChartCurrencyLabel(value);
  const labelX = Number(x);
  const labelY = Number(y);
  const labelWidth = Number(width);
  const labelHeight = Number(height);

  if (
    !label ||
    !Number.isFinite(labelX) ||
    !Number.isFinite(labelY) ||
    !Number.isFinite(labelWidth) ||
    !Number.isFinite(labelHeight)
  ) {
    return null;
  }

  const centerX = labelX + labelWidth / 2;
  const centerY = labelY + labelHeight / 2;
  const backgroundWidth = Math.max(54, label.length * 7.2);

  return (
    <g>
      <rect
        x={centerX - backgroundWidth / 2}
        y={centerY - 11}
        width={backgroundWidth}
        height={22}
        rx={8}
        fill="#05080f"
        opacity={0.72}
      />
      <text
        x={centerX}
        y={centerY + 4}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={12}
        fontWeight={800}
      >
        {label}
      </text>
    </g>
  );
}

function sortPeriodNames(a: string, b: string) {
  const indexA = MONTH_ORDER.indexOf(a as (typeof MONTH_ORDER)[number]);
  const indexB = MONTH_ORDER.indexOf(b as (typeof MONTH_ORDER)[number]);

  if (indexA !== -1 || indexB !== -1) {
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  }

  return a.localeCompare(b, "es");
}

function buildTotals(rows: SummaryRow[]): Totals {
  const lineSet = new Set<string>();

  const totals = rows.reduce<Totals>(
    (acc, row) => {
      lineSet.add(row.linea);

      return {
        previous: acc.previous + row.previousAmount,
        planned: acc.planned + row.plannedAmount,
        actual: acc.actual + row.actualAmount,
        grossMargin: acc.grossMargin + (row.grossMargin ?? 0),
        lineCount: 0,
      };
    },
    { previous: 0, planned: 0, actual: 0, grossMargin: 0, lineCount: 0 },
  );

  return {
    ...totals,
    lineCount: lineSet.size,
  };
}

function buildMetricRows(
  rows: SummaryRow[],
  keySelector: (row: SummaryRow) => string | null | undefined,
) {
  const grouped = new Map<
    string,
    Totals & {
      lines: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = keySelector(row) || "Sin dato";
    const current =
      grouped.get(key) ??
      {
        previous: 0,
        planned: 0,
        actual: 0,
        grossMargin: 0,
        lineCount: 0,
        lines: new Set<string>(),
      };

    current.previous += row.previousAmount;
    current.planned += row.plannedAmount;
    current.actual += row.actualAmount;
    current.grossMargin += row.grossMargin ?? 0;
    current.lines.add(row.linea);
    grouped.set(key, current);
  }

  return [...grouped.entries()].map<MetricRow>(([name, value]) => ({
    name,
    previous: value.previous,
    planned: value.planned,
    actual: value.actual,
    grossMargin: value.grossMargin,
    lineCount: value.lines.size,
    variance: value.actual - value.planned,
    achievement: value.planned ? (value.actual / value.planned) * 100 : null,
    marginPct:
      value.actual || value.planned
        ? (value.grossMargin / (value.actual || value.planned)) * 100
        : null,
  }));
}

function normalizeDisplayRows(mode: DashboardMode, rows: SummaryRow[]) {
  if (mode !== "accounting-budget") return rows;

  return rows.map((row) => ({
    ...row,
    previousAmount: row.previousAmount / ACCOUNTING_BUDGET_DISPLAY_DIVISOR,
    plannedAmount: row.plannedAmount / ACCOUNTING_BUDGET_DISPLAY_DIVISOR,
    actualAmount: row.actualAmount / ACCOUNTING_BUDGET_DISPLAY_DIVISOR,
    grossMargin:
      row.grossMargin === null
        ? null
        : row.grossMargin / ACCOUNTING_BUDGET_DISPLAY_DIVISOR,
  }));
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Surface className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200">
          {icon}
        </div>
      </div>
    </Surface>
  );
}

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-slate-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <div className="min-w-[260px] rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300"
        >
          Todos
        </button>
      </div>
      <div className="flex max-h-28 flex-wrap gap-2 overflow-auto pr-1">
        {options.map((option) => {
          const active = selected.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-sky-400 bg-sky-500 text-white"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
      {label}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-xl">
      {label ? (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
      ) : null}
      <div className="space-y-2">
        {payload.map((item) => (
          <div
            key={`${item.name}-${item.value}`}
            className="flex items-center justify-between gap-6"
          >
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill }}
              />
              {item.name}
            </div>
            <span className="text-sm font-semibold text-white">
              {String(item.name).includes("%")
                ? formatPercent(item.value)
                : formatFullCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildDashboardCopy(mode: DashboardMode, totals: Totals, hasMarginAccess: boolean) {
  if (mode === "accounting-budget") {
    return {
      eyebrow: "Dashboard financiero",
      title: "Contabilidad",
      subtitle: "Vista mensual contable con estructura de presupuesto por año, periodo y categoría.",
      chartTitle: hasMarginAccess ? "Contabilidad y MG por periodo" : "Contabilidad por periodo",
      chartSubtitle: hasMarginAccess
        ? "Ventas planificadas y margen bruto desde las cargas contables."
        : "Ventas planificadas desde las cargas contables.",
      distributionTitle: "Participación por categoría",
      distributionSubtitle: "Distribución de ventas contables por grupo.",
      emptyLabel: "No hay datos contables para los filtros seleccionados.",
      kpis: [
        {
          title: "Contabilidad",
          value: formatFullCurrency(totals.planned),
          subtitle: "Total visible",
          icon: <Target className="size-5" />,
        },
        {
          title: "MG contable",
          value: formatFullCurrency(totals.grossMargin),
          subtitle: "Margen bruto visible",
          icon: <TrendingUp className="size-5" />,
        },
        {
          title: "MG %",
          value: formatPercent(totals.planned ? (totals.grossMargin / totals.planned) * 100 : null),
          subtitle: "Margen sobre contabilidad",
          icon: <Scale className="size-5" />,
        },
        {
          title: "Lineas",
          value: new Intl.NumberFormat("es-PE").format(totals.lineCount),
          subtitle: "Lineas contables visibles",
          icon: <Calculator className="size-5" />,
        },
      ],
    };
  }

  if (mode === "accounting") {
    return {
      eyebrow: "Dashboard financiero",
      title: "Contabilidad",
      subtitle: "Vista pura de contabilidad por año, periodo y categoría.",
      chartTitle: hasMarginAccess ? "Ventas y margen por periodo" : "Ventas por periodo",
      chartSubtitle: hasMarginAccess
        ? "Facturación real y margen bruto desde contabilidad."
        : "Facturación real desde contabilidad.",
      distributionTitle: "Participación por categoría",
      distributionSubtitle: "Distribución de facturación real por grupo.",
      emptyLabel: "No hay datos contables para los filtros seleccionados.",
      kpis: [
        {
          title: "Venta real",
          value: formatFullCurrency(totals.actual),
          subtitle: "Total contable visible",
          icon: <CircleDollarSign className="size-5" />,
        },
        {
          title: "Margen bruto",
          value: formatFullCurrency(totals.grossMargin),
          subtitle: "Margen agregado",
          icon: <TrendingUp className="size-5" />,
        },
        {
          title: "Margen %",
          value: formatPercent(totals.actual ? (totals.grossMargin / totals.actual) * 100 : null),
          subtitle: "Margen sobre venta real",
          icon: <Scale className="size-5" />,
        },
        {
          title: "Lineas",
          value: new Intl.NumberFormat("es-PE").format(totals.lineCount),
          subtitle: "Lineas contables visibles",
          icon: <Calculator className="size-5" />,
        },
      ],
    };
  }

  if (mode === "budget") {
    return {
      eyebrow: "Dashboard financiero",
      title: "Presupuestos",
      subtitle: "Vista mensual de presupuesto por año, periodo y categoría.",
      chartTitle: hasMarginAccess ? "Presupuesto y MG por periodo" : "Presupuesto por periodo",
      chartSubtitle: hasMarginAccess
        ? "Ventas presupuestadas y margen bruto desde el nuevo Excel mensual."
        : "Ventas presupuestadas desde el nuevo Excel mensual.",
      distributionTitle: "Participación por categoría",
      distributionSubtitle: "Distribución de ventas presupuestadas por grupo.",
      emptyLabel: "No hay datos de presupuesto para los filtros seleccionados.",
      kpis: [
        {
          title: "Presupuesto",
          value: formatFullCurrency(totals.planned),
          subtitle: "Plan visible",
          icon: <Target className="size-5" />,
        },
        {
          title: "MG presupuestado",
          value: formatFullCurrency(totals.grossMargin),
          subtitle: "Margen bruto visible",
          icon: <TrendingUp className="size-5" />,
        },
        {
          title: "MG %",
          value: formatPercent(totals.planned ? (totals.grossMargin / totals.planned) * 100 : null),
          subtitle: "Margen sobre presupuesto",
          icon: <Scale className="size-5" />,
        },
        {
          title: "Lineas",
          value: new Intl.NumberFormat("es-PE").format(totals.lineCount),
          subtitle: "Lineas presupuestadas",
          icon: <Calculator className="size-5" />,
        },
      ],
    };
  }

  return {
    eyebrow: "Dashboard financiero",
    title: "Comparativo Contabilidad vs Presupuesto",
    subtitle: "Cruce por categoría entre venta real contable y presupuesto.",
    chartTitle: "Real vs presupuesto por categoría",
    chartSubtitle: "Comparación directa entre contabilidad y presupuesto agrupada por grupo.",
    distributionTitle: "Participación real por categoría",
    distributionSubtitle: "Peso relativo de cada grupo en la venta real.",
    emptyLabel: "No hay datos comparables para los filtros seleccionados.",
    kpis: [
      {
        title: "Real contable",
        value: formatFullCurrency(totals.actual),
        subtitle: "Venta real visible",
        icon: <CircleDollarSign className="size-5" />,
      },
      {
        title: "Presupuesto",
        value: formatFullCurrency(totals.planned),
        subtitle: "Plan visible",
        icon: <Target className="size-5" />,
      },
      {
        title: "Cumplimiento",
        value: formatPercent(totals.planned ? (totals.actual / totals.planned) * 100 : null),
        subtitle: "Real sobre presupuesto",
        icon: <TrendingUp className="size-5" />,
      },
      {
        title: "Variación",
        value: formatFullCurrency(totals.actual - totals.planned),
        subtitle: "Real menos presupuesto",
        icon: <Scale className="size-5" />,
      },
    ],
  };
}

export function FinancialFocusDashboard({
  mode,
  summary,
}: {
  mode: DashboardMode;
  summary: FinancialSummary;
}) {
  const [selectedYear, setSelectedYear] = useState(ALL_VALUE);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [selectedNegocio, setSelectedNegocio] = useState(ALL_VALUE);
  const [selectedGroup, setSelectedGroup] = useState(ALL_VALUE);

  const selectedYearNumber = selectedYear === ALL_VALUE ? null : Number(selectedYear);

  const periodFilteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedYearNumber !== null && row.importYear !== selectedYearNumber) return false;
        if (selectedPeriods.length > 0 && !selectedPeriods.includes(row.periodo)) return false;
        return true;
      }),
    [selectedPeriods, selectedYearNumber, summary.rows],
  );
  const rawFilteredRows = useMemo(
    () =>
      periodFilteredRows.filter((row) => {
        if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
        if (selectedGroup !== ALL_VALUE && row.grupo !== selectedGroup) return false;
        return true;
      }),
    [periodFilteredRows, selectedGroup, selectedNegocio],
  );
  const filteredRows = useMemo(
    () => normalizeDisplayRows(mode, rawFilteredRows),
    [mode, rawFilteredRows],
  );
  const periodDisplayRows = useMemo(
    () => normalizeDisplayRows(mode, periodFilteredRows),
    [mode, periodFilteredRows],
  );

  const hasMarginAccess = summary.hasMarginAccess;
  const totals = useMemo(() => buildTotals(filteredRows), [filteredRows]);
  const copy = buildDashboardCopy(mode, totals, hasMarginAccess);
  const visibleKpis = hasMarginAccess
    ? copy.kpis
    : copy.kpis.filter((kpi) => !/margen|mg/i.test(`${kpi.title} ${kpi.subtitle}`));
  const isBudgetPresentation = mode === "budget" || mode === "accounting-budget";

  const metricRows = useMemo(
    () =>
      buildMetricRows(filteredRows, (row) => row.grupo).sort((a, b) => {
        if (isBudgetPresentation) return b.planned - a.planned;
        if (mode === "comparison") return b.actual - a.actual;
        return b.actual - a.actual;
      }),
    [filteredRows, isBudgetPresentation, mode],
  );

  const evolutionRows = useMemo(() => {
    const grouped = buildMetricRows(
      filteredRows,
      (row) => (selectedYearNumber === null ? String(row.importYear) : row.periodo),
    );

    return grouped.sort((a, b) =>
      selectedYearNumber === null
        ? Number(a.name) - Number(b.name)
        : sortPeriodNames(a.name, b.name),
    );
  }, [filteredRows, selectedYearNumber]);

  const chartRows = mode === "comparison" ? metricRows.slice(0, 12) : evolutionRows;
  const distributionMetricRows = useMemo(
    () =>
      buildMetricRows(periodDisplayRows, (row) => row.grupo).sort((a, b) => {
        if (isBudgetPresentation) return b.planned - a.planned;
        return b.actual - a.actual;
      }),
    [isBudgetPresentation, periodDisplayRows],
  );
  const distributionRows = distributionMetricRows
    .map((row) => ({
      name: row.name,
      value:
        isBudgetPresentation
          ? row.planned
          : mode === "comparison"
            ? row.actual
            : row.actual,
    }))
    .filter((row) => row.value > 0);

  const yearOptions = [{ label: "Historico", value: ALL_VALUE }].concat(
    summary.years.map((year) => ({ label: String(year), value: String(year) })),
  );
  const negocioOptions = [{ label: "Todos los negocios", value: ALL_VALUE }].concat(
    summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
  );
  const groupOptions = [{ label: "Todas las categorias", value: ALL_VALUE }].concat(
    summary.grupos.map((grupo) => ({ label: grupo, value: grupo })),
  );
  const tableColSpan =
    mode === "comparison" ? (hasMarginAccess ? 7 : 6) : hasMarginAccess ? 5 : 4;

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-300">
      <div className="mx-auto max-w-[1500px] px-6 py-10">
        <header className="mb-10 flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-3 text-sky-400">
              <div className="rounded-2xl bg-sky-500/10 p-3">
                <LayoutDashboard className="size-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em]">
                {copy.eyebrow}
              </span>
            </div>
            <h1 className="mt-3 text-4xl font-bold text-white">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">{copy.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center gap-2 px-2 text-slate-500">
              <Filter className="size-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">
                Filtros
              </span>
            </div>
            <SelectFilter label="Año" value={selectedYear} onChange={setSelectedYear} options={yearOptions} />
            <MultiSelectFilter
              label="Periodos"
              options={summary.periodos}
              selected={selectedPeriods}
              onChange={setSelectedPeriods}
            />
            <SelectFilter label="Negocio" value={selectedNegocio} onChange={setSelectedNegocio} options={negocioOptions} />
            <SelectFilter label="Categoria" value={selectedGroup} onChange={setSelectedGroup} options={groupOptions} />
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {visibleKpis.map((kpi) => (
            <KpiCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              icon={kpi.icon}
            />
          ))}
        </div>

        <div className="mt-8 grid min-w-0 grid-cols-1 gap-8">
          <Surface className="p-6">
            <h2 className="text-xl font-semibold text-white">{copy.chartTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{copy.chartSubtitle}</p>

            <div className="mt-6 h-[420px] min-h-[420px] min-w-0">
              {chartRows.length ? (
                <ResponsiveContainer width="100%" height={420} minWidth={0}>
                  <ComposedChart data={chartRows} margin={{ top: 52, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatCompactCurrency(Number(value))}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatPercent(Number(value))}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {mode === "accounting" ? (
                      <>
                        <Bar yAxisId="left" dataKey="actual" name="Real" fill="#38bdf8" radius={[8, 8, 0, 0]} barSize={56}>
                          <LabelList dataKey="actual" content={<BarValueLabel />} />
                        </Bar>
                        {hasMarginAccess ? (
                          <Bar yAxisId="left" dataKey="grossMargin" name="Margen bruto" fill="#10b981" radius={[8, 8, 0, 0]} barSize={56}>
                            <LabelList dataKey="grossMargin" content={<BarValueLabel />} />
                          </Bar>
                        ) : null}
                        {hasMarginAccess ? (
                          <Line yAxisId="right" type="monotone" dataKey="marginPct" name="Margen %" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }}>
                            <LabelList dataKey="marginPct" content={<AdaptiveLineLabel fill="#fbbf24" labelCount={chartRows.length} />} />
                          </Line>
                        ) : null}
                      </>
                    ) : null}
                    {isBudgetPresentation ? (
                      <>
                        <Bar yAxisId="left" dataKey="planned" name={mode === "accounting-budget" ? "Contabilidad" : "Presupuesto"} fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={56}>
                          <LabelList dataKey="planned" content={<BarValueLabel />} />
                        </Bar>
                        {hasMarginAccess ? (
                          <Bar yAxisId="left" dataKey="grossMargin" name={mode === "accounting-budget" ? "MG contable" : "MG presupuestado"} fill="#10b981" radius={[8, 8, 0, 0]} barSize={56}>
                            <LabelList dataKey="grossMargin" content={<BarValueLabel />} />
                          </Bar>
                        ) : null}
                        {hasMarginAccess ? (
                          <Line yAxisId="right" type="monotone" dataKey="marginPct" name="MG %" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }}>
                            <LabelList dataKey="marginPct" content={<AdaptiveLineLabel fill="#7dd3fc" labelCount={chartRows.length} />} />
                          </Line>
                        ) : null}
                      </>
                    ) : null}
                    {mode === "comparison" ? (
                      <>
                        <Bar yAxisId="left" dataKey="actual" name="Real" fill="#38bdf8" radius={[8, 8, 0, 0]} barSize={56}>
                          <LabelList dataKey="actual" content={<BarValueLabel />} />
                        </Bar>
                        <Bar yAxisId="left" dataKey="planned" name="Presupuesto" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={56}>
                          <LabelList dataKey="planned" content={<BarValueLabel />} />
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="achievement" name="Cumplimiento %" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }}>
                          <LabelList dataKey="achievement" content={<AdaptiveLineLabel fill="#86efac" labelCount={chartRows.length} />} />
                        </Line>
                      </>
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState label={copy.emptyLabel} />
              )}
            </div>
          </Surface>

          <Surface className="p-6">
            <h2 className="text-xl font-semibold text-white">{copy.distributionTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{copy.distributionSubtitle}</p>

            <div className="mt-6 h-[320px] min-h-[320px] min-w-0">
              {distributionRows.length ? (
                <ResponsiveContainer width="100%" height={320} minWidth={0}>
                  <PieChart>
                    <Pie
                      data={distributionRows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                    >
                      {distributionRows.map((row, index) => (
                        <Cell
                          key={`${row.name}-${row.value}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState label={copy.emptyLabel} />
              )}
            </div>

            <div className="mt-4 space-y-3">
              {distributionRows.slice(0, 6).map((row, index) => (
                <div key={row.name} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-slate-300">{row.name}</span>
                  </div>
                  <span className="font-medium text-white">{formatCompactCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </Surface>
        </div>

        <Surface className="mt-8 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-5">
            <h2 className="text-xl font-semibold text-white">Detalle por categoría</h2>
            <p className="mt-1 text-sm text-slate-500">
              Resumen agrupado por categoría para los filtros actuales.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Categoría</th>
                  {!isBudgetPresentation ? <th className="px-6 py-4 text-right">Real</th> : null}
                  {mode !== "accounting" ? (
                    <th className="px-6 py-4 text-right">
                      {mode === "accounting-budget" ? "Contabilidad" : "Presupuesto"}
                    </th>
                  ) : null}
                  {!isBudgetPresentation ? <th className="px-6 py-4 text-right">Cierre previo</th> : null}
                  {hasMarginAccess ? <th className="px-6 py-4 text-right">Margen</th> : null}
                  {isBudgetPresentation && hasMarginAccess ? <th className="px-6 py-4 text-right">MG %</th> : null}
                  {mode === "comparison" ? <th className="px-6 py-4 text-right">Cumplimiento</th> : null}
                  <th className="px-6 py-4 text-right">Líneas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {metricRows.length ? (
                  metricRows.map((row) => (
                    <tr key={row.name} className="hover:bg-white/5">
                      <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                      {!isBudgetPresentation ? (
                        <td className="px-6 py-4 text-right text-slate-200">
                          {formatFullCurrency(row.actual)}
                        </td>
                      ) : null}
                      {mode !== "accounting" ? (
                        <td className="px-6 py-4 text-right text-slate-200">
                          {formatFullCurrency(row.planned)}
                        </td>
                      ) : null}
                      {!isBudgetPresentation ? (
                        <td className="px-6 py-4 text-right text-slate-400">
                          {formatFullCurrency(row.previous)}
                        </td>
                      ) : null}
                      {hasMarginAccess ? (
                        <td className="px-6 py-4 text-right text-slate-200">
                          {formatFullCurrency(row.grossMargin)}
                        </td>
                      ) : null}
                      {isBudgetPresentation && hasMarginAccess ? (
                        <td className="px-6 py-4 text-right text-slate-200">
                          {formatPercent(row.marginPct)}
                        </td>
                      ) : null}
                      {mode === "comparison" ? (
                        <td className="px-6 py-4 text-right font-medium text-emerald-400">
                          {formatPercent(row.achievement)}
                        </td>
                      ) : null}
                      <td className="px-6 py-4 text-right text-slate-400">
                        {new Intl.NumberFormat("es-PE").format(row.lineCount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={tableColSpan}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      {copy.emptyLabel}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>
    </div>
  );
}
