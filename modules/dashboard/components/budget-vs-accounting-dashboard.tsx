"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Filter, Goal, ListChecks, Scale, Table2, TrendingUp, WalletCards } from "lucide-react";

import type { BudgetVsAccountingSummary } from "@/modules/dashboard/services/financial-dashboards";

const CHART_COLORS = ["#38bdf8", "#f59e0b", "#10b981", "#8b5cf6", "#f43f5e", "#06b6d4", "#84cc16", "#fb7185"] as const;

type MetricRow = {
  negocio: string;
  previousReal: number;
  currentBudget: number;
  currentReal: number;
  variation: number;
  variationPct: number | null;
  achievementPct: number | null;
  grossMargin: number;
  grossMarginPct: number | null;
};

type LineMetricRow = MetricRow & {
  linea: string;
};

type ComparisonChartRow = MetricRow & {
  chartLabel: string;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCompactCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value)}%`;
}

function ToggleList({
  label,
  options,
  selected,
  onChange,
  disabled = false,
  disabledMessage = "Selecciona una opcion previa.",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  disabledMessage?: string;
}) {
  const canSelect = !disabled;

  function toggle(value: string) {
    if (!canSelect) return;
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <div className={`min-w-[240px] flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 ${disabled ? "opacity-60" : ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={!canSelect}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300 disabled:cursor-not-allowed disabled:text-slate-600"
        >
          Todos
        </button>
      </div>
      {disabled ? <p className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500">{disabledMessage}</p> : null}
      <div className="flex max-h-40 flex-wrap gap-2 overflow-auto pr-1">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              disabled={!canSelect}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active ? "border-sky-400 bg-sky-500 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              } disabled:cursor-not-allowed disabled:hover:border-slate-700`}
            >
              {option}
            </button>
          );
        })}
      </div>
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
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-slate-200">{icon}</div>
      </div>
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
      {label ? <p className="mb-2 text-sm font-semibold text-white">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-6 text-sm">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              {item.name}
            </span>
            <span className="font-semibold text-white">{String(item.name).includes("%") ? formatPercent(item.value) : formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildMetricRows(rows: BudgetVsAccountingSummary["rows"]) {
  const grouped = new Map<string, Omit<MetricRow, "variation" | "variationPct" | "achievementPct" | "grossMarginPct">>();

  for (const row of rows) {
    const current =
      grouped.get(row.negocio) ??
      {
        negocio: row.negocio,
        previousReal: 0,
        currentBudget: 0,
        currentReal: 0,
        grossMargin: 0,
      };

    current.previousReal += row.previousReal;
    current.currentBudget += row.currentBudget;
    current.currentReal += row.currentReal;
    current.grossMargin += row.grossMargin;
    grouped.set(row.negocio, current);
  }

  return [...grouped.values()]
    .map<MetricRow>((row) => {
      const variation = row.currentReal - row.previousReal;
      return {
        ...row,
        variation,
        variationPct: row.previousReal ? (variation / row.previousReal) * 100 : null,
        achievementPct: row.currentBudget ? (row.currentReal / row.currentBudget) * 100 : null,
        grossMarginPct: row.currentReal ? (row.grossMargin / row.currentReal) * 100 : null,
      };
    })
    .sort((a, b) => b.currentReal - a.currentReal);
}

function buildLineMetricRows(rows: BudgetVsAccountingSummary["rows"]) {
  const grouped = new Map<string, Omit<LineMetricRow, "variation" | "variationPct" | "achievementPct" | "grossMarginPct">>();

  for (const row of rows) {
    const key = `${row.negocio}::${row.linea}`;
    const current =
      grouped.get(key) ??
      {
        negocio: row.negocio,
        linea: row.linea,
        previousReal: 0,
        currentBudget: 0,
        currentReal: 0,
        grossMargin: 0,
      };

    current.previousReal += row.previousReal;
    current.currentBudget += row.currentBudget;
    current.currentReal += row.currentReal;
    current.grossMargin += row.grossMargin;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map<LineMetricRow>((row) => {
      const variation = row.currentReal - row.previousReal;
      return {
        ...row,
        variation,
        variationPct: row.previousReal ? (variation / row.previousReal) * 100 : null,
        achievementPct: row.currentBudget ? (row.currentReal / row.currentBudget) * 100 : null,
        grossMarginPct: row.currentReal ? (row.grossMargin / row.currentReal) * 100 : null,
      };
    })
    .sort((a, b) => a.negocio.localeCompare(b.negocio, "es") || b.currentReal - a.currentReal);
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
      No hay datos para los filtros actuales.
    </div>
  );
}

export function BudgetVsAccountingDashboard({ summary }: { summary: BudgetVsAccountingSummary }) {
  const [selectedNegocios, setSelectedNegocios] = useState<string[]>([]);
  const [selectedLineas, setSelectedLineas] = useState<string[]>([]);
  const [selectedPeriodos, setSelectedPeriodos] = useState<string[]>(summary.periodos.slice(0, 2));
  const [comparisonView, setComparisonView] = useState<"chart" | "table">("table");

  const activePeriodos = selectedPeriodos.length ? selectedPeriodos : summary.periodos;
  const lineOptions = useMemo(() => {
    if (!selectedNegocios.length) return [];

    const options = new Set<string>();

    for (const row of summary.rows) {
      if (!selectedNegocios.includes(row.negocio)) continue;
      options.add(row.linea);
    }

    return [...options].sort((a, b) => a.localeCompare(b, "es"));
  }, [selectedNegocios, summary.rows]);

  const filteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedNegocios.length > 0 && !selectedNegocios.includes(row.negocio)) return false;
        if (selectedLineas.length > 0 && !selectedLineas.includes(row.linea)) return false;
        if (activePeriodos.length > 0 && !activePeriodos.includes(row.periodo)) return false;
        return true;
      }),
    [activePeriodos, selectedLineas, selectedNegocios, summary.rows],
  );

  const metricRows = useMemo(() => buildMetricRows(filteredRows), [filteredRows]);
  const lineMetricRows = useMemo(() => buildLineMetricRows(filteredRows), [filteredRows]);
  const totalRow = useMemo(
    () =>
      buildMetricRows([
        {
          currentYear: summary.currentYear,
          previousYear: summary.previousYear,
          negocio: "Total general",
          linea: "Total",
          periodo: "Total",
          previousReal: metricRows.reduce((sum, row) => sum + row.previousReal, 0),
          currentBudget: metricRows.reduce((sum, row) => sum + row.currentBudget, 0),
          currentReal: metricRows.reduce((sum, row) => sum + row.currentReal, 0),
          grossMargin: metricRows.reduce((sum, row) => sum + row.grossMargin, 0),
        },
      ])[0],
    [metricRows, summary.currentYear, summary.previousYear],
  );

  const chartRows = metricRows.slice(0, 12);
  const comparisonChartRows = useMemo<ComparisonChartRow[]>(() => {
    if (selectedNegocios.length > 0) {
      return lineMetricRows.map((row) => ({
        ...row,
        chartLabel: selectedNegocios.length === 1 ? row.linea : `${row.negocio} - ${row.linea}`,
      }));
    }

    return chartRows.map((row) => ({
      ...row,
      chartLabel: row.negocio,
    }));
  }, [chartRows, lineMetricRows, selectedNegocios.length]);
  const comparisonChartHeight = Math.max(520, comparisonChartRows.length * 46);
  const comparisonChartShowsLines = selectedNegocios.length > 0;
  const comparisonTableRows = comparisonChartShowsLines ? lineMetricRows : metricRows;
  const periodLabel = activePeriodos.length === summary.periodos.length ? "Todos los meses" : activePeriodos.join(" - ");
  const handleNegociosChange = (values: string[]) => {
    setSelectedNegocios(values);
    setSelectedLineas((current) => {
      if (!values.length) return [];
      if (!current.length) return current;

      const allowed = new Set(
        summary.rows
          .filter((row) => values.includes(row.negocio))
          .map((row) => row.linea),
      );

      return current.filter((linea) => allowed.has(linea));
    });
  };

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-300">
      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-3 text-sky-400">
              <div className="rounded-2xl bg-sky-500/10 p-3">
                <Goal className="size-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Contabilidad vs presupuesto</span>
            </div>
            <h1 className="mt-3 text-4xl font-bold text-white">Comparativo {summary.previousYear} real vs {summary.currentYear}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Cruce de contabilidad real contra el presupuesto de {summary.currentYear}, siempre comparado con el año anterior.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={`${summary.previousYear} real`} value={formatCurrency(totalRow?.previousReal)} subtitle={periodLabel} icon={<WalletCards className="size-5" />} />
          <KpiCard title={`${summary.currentYear} PPTO`} value={formatCurrency(totalRow?.currentBudget)} subtitle="Presupuesto visible" icon={<Goal className="size-5" />} />
          <KpiCard title={`${summary.currentYear} real`} value={formatCurrency(totalRow?.currentReal)} subtitle="Contabilidad visible" icon={<TrendingUp className="size-5" />} />
          <KpiCard title="% logro PPTO" value={formatPercent(totalRow?.achievementPct)} subtitle={`MB ${formatPercent(totalRow?.grossMarginPct)}`} icon={<Scale className="size-5" />} />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-center gap-2 px-1 text-slate-400">
            <Filter className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Filtros multiples</span>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ToggleList label="Meses" options={summary.periodos} selected={selectedPeriodos} onChange={setSelectedPeriodos} />
            <ToggleList label="Negocios" options={summary.negocios} selected={selectedNegocios} onChange={handleNegociosChange} />
            <ToggleList
              label="Lineas"
              options={lineOptions}
              selected={selectedLineas}
              onChange={setSelectedLineas}
              disabled={!selectedNegocios.length}
              disabledMessage="Marca un negocio para ver sus lineas."
            />
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(380px,1fr)]">
          <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
              <div>
                <h2 className="text-2xl font-semibold text-white">Real vs presupuesto por {comparisonChartShowsLines ? "linea" : "negocio"}</h2>
                <p className="mt-2 text-base text-slate-400">
                  Compara {summary.previousYear} real, {summary.currentYear} PPTO y {summary.currentYear} real.
                </p>
              </div>
              <div className="flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
                <button
                  type="button"
                  onClick={() => setComparisonView("chart")}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    comparisonView === "chart" ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <BarChart3 className="size-4" />
                  Grafico
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonView("table")}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    comparisonView === "table" ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  <Table2 className="size-4" />
                  Tabla
                </button>
              </div>
            </div>
            <div className="mt-6 h-[520px] min-h-[520px] min-w-0">
              {comparisonView === "chart" && comparisonChartRows.length ? (
                <div className="h-full overflow-x-auto overflow-y-auto">
                  <ResponsiveContainer width="100%" height={comparisonChartHeight} minWidth={comparisonChartShowsLines ? Math.max(980, comparisonChartRows.length * 92) : 0}>
                    <BarChart data={comparisonChartRows} margin={{ top: 64, right: 36, bottom: 150, left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="chartLabel" stroke="#ffffff" tickLine={false} axisLine={false} tick={{ fontSize: comparisonChartShowsLines ? 13 : 17, fill: "#ffffff", fontWeight: 800 }} angle={-35} textAnchor="end" interval={0} height={158} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 15, fill: "#cbd5e1", fontWeight: 700 }} width={92} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, paddingBottom: 16 }} />
                    <Bar dataKey="previousReal" name={`${summary.previousYear} real`} fill="#64748b" radius={[8, 8, 0, 0]}>
                      <LabelList position="top" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={14} fontWeight={900} />
                    </Bar>
                    <Bar dataKey="currentBudget" name={`${summary.currentYear} PPTO`} fill="#f59e0b" radius={[8, 8, 0, 0]}>
                      <LabelList position="top" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={14} fontWeight={900} />
                    </Bar>
                    <Bar dataKey="currentReal" name={`${summary.currentYear} real`} fill="#38bdf8" radius={[8, 8, 0, 0]}>
                      <LabelList position="top" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={14} fontWeight={900} />
                    </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
              {comparisonView === "table" && comparisonTableRows.length ? (
                <div className="h-full overflow-auto rounded-2xl border border-slate-800">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Negocio</th>
                        {comparisonChartShowsLines ? <th className="px-5 py-4">Linea</th> : null}
                        <th className="px-5 py-4 text-right">{summary.previousYear} real</th>
                        <th className="px-5 py-4 text-right">{summary.currentYear} PPTO</th>
                        <th className="px-5 py-4 text-right">{summary.currentYear} real</th>
                        <th className="px-5 py-4 text-right">Variacion</th>
                        <th className="px-5 py-4 text-right">% logro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {comparisonTableRows.map((row) => (
                        <tr key={comparisonChartShowsLines ? `${row.negocio}-${(row as LineMetricRow).linea}` : row.negocio} className="hover:bg-white/5">
                          <td className="px-5 py-4 font-semibold text-white">{row.negocio}</td>
                          {comparisonChartShowsLines ? <td className="px-5 py-4 text-slate-300">{(row as LineMetricRow).linea}</td> : null}
                          <td className="px-5 py-4 text-right tabular-nums">{formatNumber(row.previousReal)}</td>
                          <td className="px-5 py-4 text-right tabular-nums">{formatNumber(row.currentBudget)}</td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-white">{formatNumber(row.currentReal)}</td>
                          <td className={`px-5 py-4 text-right font-semibold tabular-nums ${row.variation >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatNumber(row.variation)}</td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-sky-300">{formatPercent(row.achievementPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {((comparisonView === "chart" && !comparisonChartRows.length) || (comparisonView === "table" && !comparisonTableRows.length)) ? (
                <EmptyState />
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-xl font-semibold text-white">Logro y margen</h2>
            <p className="mt-1 text-sm text-slate-500">% logro PPTO y %MB por negocio.</p>
            <div className="mt-6 h-[520px] min-h-[520px] min-w-0">
              {chartRows.length ? (
                <ResponsiveContainer width="100%" height={520} minWidth={0}>
                  <ComposedChart data={chartRows} margin={{ top: 32, right: 28, bottom: 110, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="negocio" stroke="#ffffff" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#ffffff", fontWeight: 700 }} angle={-25} textAnchor="end" interval={0} height={120} />
                    <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12, fill: "#cbd5e1" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="achievementPct" name="% logro PPTO" radius={[8, 8, 0, 0]}>
                      {chartRows.map((row, index) => (
                        <Cell key={row.negocio} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="grossMarginPct" name="%MB" stroke="#a3e635" strokeWidth={3} dot={{ r: 4, fill: "#a3e635" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
            <ListChecks className="size-5 text-sky-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">{periodLabel}</h2>
              <p className="mt-1 text-sm text-slate-500">Resumen agrupado por negocio con las líneas seleccionadas.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Negocio</th>
                  <th className="px-6 py-4 text-right">{summary.previousYear} real</th>
                  <th className="px-6 py-4 text-right">{summary.currentYear} PPTO</th>
                  <th className="px-6 py-4 text-right">{summary.currentYear} real</th>
                  <th className="px-6 py-4 text-right">Variacion imp.</th>
                  <th className="px-6 py-4 text-right">% variacion</th>
                  <th className="px-6 py-4 text-right">% logro PPTO</th>
                  <th className="px-6 py-4 text-right">MB</th>
                  <th className="px-6 py-4 text-right">%MB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {metricRows.map((row) => (
                  <tr key={row.negocio} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-semibold text-white">{row.negocio}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(row.previousReal)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(row.currentBudget)}</td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-white">{formatNumber(row.currentReal)}</td>
                    <td className={`px-6 py-4 text-right font-semibold tabular-nums ${row.variation >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatNumber(row.variation)}</td>
                    <td className={`px-6 py-4 text-right font-semibold tabular-nums ${row.variation >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPercent(row.variationPct)}</td>
                    <td className="px-6 py-4 text-right font-semibold tabular-nums text-sky-300">{formatPercent(row.achievementPct)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(row.grossMargin)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatPercent(row.grossMarginPct)}</td>
                  </tr>
                ))}
                {totalRow ? (
                  <tr className="border-t-2 border-slate-600 bg-white/5 font-bold text-white">
                    <td className="px-6 py-4">Total general</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(totalRow.previousReal)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(totalRow.currentBudget)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(totalRow.currentReal)}</td>
                    <td className={`px-6 py-4 text-right tabular-nums ${totalRow.variation >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatNumber(totalRow.variation)}</td>
                    <td className={`px-6 py-4 text-right tabular-nums ${totalRow.variation >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatPercent(totalRow.variationPct)}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-sky-300">{formatPercent(totalRow.achievementPct)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatNumber(totalRow.grossMargin)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{formatPercent(totalRow.grossMarginPct)}</td>
                  </tr>
                ) : null}
                {!metricRows.length ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                      No hay datos para los filtros actuales.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
