"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Filter, Layers3, Rows3, Table2, TrendingUp, WalletCards } from "lucide-react";

import type {
  CurrentPortfolioStatus,
  CurrentPortfolioSummary,
} from "@/modules/dashboard/services/current-portfolio";
import { exportRowsToExcel } from "@/modules/dashboard/utils/export-excel";

const CHART_COLORS: Record<CurrentPortfolioStatus, string> = {
  facturado: "#38bdf8",
  valorizacion: "#10b981",
  proyecto: "#f59e0b",
  "por facturar": "#f97316",
  pendiente: "#f43f5e",
};
const COMPARISON_BAR_COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16", "#f43f5e"] as const;

const STATUS_LABELS: Record<CurrentPortfolioStatus, string> = {
  facturado: "Facturado",
  valorizacion: "Valorización",
  proyecto: "Proyecto",
  "por facturar": "Por facturar",
  pendiente: "Pendiente",
};
const MONTH_LABELS = [
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

type CompareMode = "negocio" | "linea";
type ViewMode = "table" | "chart";

function getDefaultSelectedYears(summary: CurrentPortfolioSummary) {
  for (const year of summary.years) {
    const yearTotal = summary.rows
      .filter((row) => row.importYear === year)
      .reduce((sum, row) => sum + row.monto, 0);

    if (yearTotal !== 0) return [String(year)];
  }

  return [];
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCompactCurrency(value: number | null | undefined) {
  const amount = value || 0;
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 1_000_000) {
    const millions = new Intl.NumberFormat("es-ES", {
      maximumFractionDigits: 3,
    }).format(absAmount / 1_000_000);

    return `${sign}S/ ${millions} M`;
  }

  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function ToggleList({
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
    <div className="min-w-[220px] flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300"
        >
          Limpiar
        </button>
      </div>
      <div className="flex max-h-36 flex-wrap gap-2 overflow-auto pr-1">
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
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
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

function ExportExcelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15"
    >
      <Download className="size-4" />
      Exportar Excel
    </button>
  );
}

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          value === "table" ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-white/5"
        }`}
      >
        <Table2 className="size-4" />
        Tabla
      </button>
      <button
        type="button"
        onClick={() => onChange("chart")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
          value === "chart" ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-white/5"
        }`}
      >
        <TrendingUp className="size-4" />
        Gráfico
      </button>
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
            <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isClosedStatus(status: CurrentPortfolioStatus) {
  return status === "facturado" || status === "valorizacion";
}

function buildClosedPendingTotals(rows: CurrentPortfolioSummary["rows"]) {
  const facturado = rows
    .filter((row) => isClosedStatus(row.situacion))
    .reduce((sum, row) => sum + row.monto, 0);
  const pendiente = rows
    .filter((row) => !isClosedStatus(row.situacion))
    .reduce((sum, row) => sum + row.monto, 0);

  return {
    facturado,
    pendiente,
    total: facturado + pendiente,
  };
}

export function CurrentPortfolioDashboard({ summary }: { summary: CurrentPortfolioSummary }) {
  const [selectedLineas, setSelectedLineas] = useState<string[]>([]);
  const [selectedNegocios, setSelectedNegocios] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState<CompareMode>("negocio");
  const [comparisonView, setComparisonView] = useState<ViewMode>("table");
  const [monthView, setMonthView] = useState<ViewMode>("table");
  const [selectedYears, setSelectedYears] = useState<string[]>(
    () => getDefaultSelectedYears(summary),
  );
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const monthOptions = MONTH_LABELS.map((month, index) => ({
    label: month,
    value: String(index),
  }));
  const selectedNegocioForLines = selectedNegocios[0] ?? null;
  const availableLineas = useMemo(() => {
    if (compareMode !== "linea" || !selectedNegocioForLines) return summary.lineas;

    return [
      ...new Set(
        summary.rows
          .filter((row) => row.negocio === selectedNegocioForLines && row.linea)
          .map((row) => row.linea as string),
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
  }, [compareMode, selectedNegocioForLines, summary.lineas, summary.rows]);

  function handleCompareModeChange(mode: CompareMode) {
    setCompareMode(mode);
    setSelectedLineas([]);
    if (mode === "linea" && selectedNegocios.length > 1) {
      setSelectedNegocios([selectedNegocios[0] as string]);
    }
  }

  function handleNegociosChange(values: string[]) {
    const nextValues = compareMode === "linea" ? values.slice(-1) : values;
    setSelectedNegocios(nextValues);
    setSelectedLineas([]);
  }

  const filteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedYears.length > 0 && !selectedYears.includes(String(row.importYear))) {
          return false;
        }
        if (
          selectedMonths.length > 0 &&
          (row.monthIndex === null || !selectedMonths.includes(String(row.monthIndex)))
        ) {
          return false;
        }
        if (compareMode === "linea" && selectedLineas.length > 0 && (!row.linea || !selectedLineas.includes(row.linea))) {
          return false;
        }
        if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) {
          return false;
        }
        return true;
      }),
    [compareMode, selectedLineas, selectedMonths, selectedNegocios, selectedYears, summary.rows],
  );

  const comparisonRows = useMemo(
    () => {
      const grouped = new Map<string, CurrentPortfolioSummary["rows"]>();

      for (const row of filteredRows) {
        const category =
          compareMode === "negocio"
            ? row.negocio ?? "Sin negocio"
            : row.linea ?? "Sin línea";
        const key = `${row.importYear}::${category}`;
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }

      return [...grouped.entries()]
        .map(([key, rows]) => {
          const [year, category] = key.split("::");
          return {
            name: `${year} - ${category}`,
            year: Number(year),
            category: category ?? "Sin dato",
            ...buildClosedPendingTotals(rows),
          };
        })
        .filter((row) => row.total > 0)
        .sort((a, b) => {
          const categoryDiff = a.category.localeCompare(b.category, "es");
          if (categoryDiff !== 0) return categoryDiff;
          return a.year - b.year;
        });
    },
    [compareMode, filteredRows],
  );

  const monthRows = useMemo(() => {
    const grouped = new Map<string, CurrentPortfolioSummary["rows"]>();

    for (const row of filteredRows) {
      if (row.monthIndex === null) continue;
      const category =
        compareMode === "negocio"
          ? row.negocio ?? "Sin negocio"
          : row.linea ?? "Sin línea";
      const key = `${row.monthIndex}::${category}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }

    return [...grouped.entries()]
      .map(([key, rows]) => {
        const [monthIndexRaw, category] = key.split("::");
        const monthIndex = Number(monthIndexRaw);
        return {
          name: `${MONTH_LABELS[monthIndex] ?? "Sin mes"} - ${category}`,
          monthIndex,
          category: category ?? "Sin dato",
          ...buildClosedPendingTotals(rows),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => {
        const categoryDiff = a.category.localeCompare(b.category, "es");
        if (categoryDiff !== 0) return categoryDiff;
        return a.monthIndex - b.monthIndex;
      });
  }, [compareMode, filteredRows]);

  const total = filteredRows.reduce((sum, row) => sum + row.monto, 0);
  const comparisonChartHeight = Math.max(720, comparisonRows.length * 86);
  const comparisonChartWidth = Math.max(1200, comparisonRows.length * 190);
  const monthChartHeight = Math.max(760, monthRows.length * 72);
  const monthChartWidth = Math.max(1300, monthRows.length * 150);

  function exportComparisonRows() {
    void exportRowsToExcel({
      filename: `estado-comercial-comparativo-${compareMode}.xlsx`,
      sheetName: "Comparativo",
      columns: [
        { header: "Nombre", key: "name", width: 34 },
        { header: "Año", key: "year", width: 12 },
        { header: compareMode === "negocio" ? "Negocio" : "Línea", key: "category", width: 28 },
        { header: "Facturado", key: "facturado", width: 16 },
        { header: "Pendiente", key: "pendiente", width: 16 },
        { header: "Total", key: "total", width: 16 },
      ],
      rows: comparisonRows,
    });
  }

  function exportMonthRows() {
    void exportRowsToExcel({
      filename: `estado-comercial-mensual-${compareMode}.xlsx`,
      sheetName: "Mensual",
      columns: [
        { header: "Nombre", key: "name", width: 34 },
        { header: "Mes", key: "monthLabel", width: 16 },
        { header: compareMode === "negocio" ? "Negocio" : "Línea", key: "category", width: 28 },
        { header: "Facturado", key: "facturado", width: 16 },
        { header: "Pendiente", key: "pendiente", width: 16 },
        { header: "Total", key: "total", width: 16 },
      ],
      rows: monthRows.map((row) => ({
        ...row,
        monthLabel: MONTH_LABELS[row.monthIndex] ?? "Sin mes",
      })),
    });
  }

  function exportFilteredDetail() {
    void exportRowsToExcel({
      filename: "estado-comercial-detalle.xlsx",
      sheetName: "Detalle",
      columns: [
        { header: "Estado", key: "estado", width: 18 },
        { header: "Línea", key: "linea", width: 30 },
        { header: "Negocio", key: "negocio", width: 20 },
        { header: "Cliente", key: "cliente", width: 40 },
        { header: "Año", key: "importYear", width: 12 },
        { header: "Mes", key: "mes", width: 16 },
        { header: "Monto", key: "monto", width: 16 },
      ],
      rows: filteredRows.map((row) => ({
        estado: STATUS_LABELS[row.situacion],
        linea: row.linea ?? "Sin línea",
        negocio: row.negocio ?? "Sin negocio",
        cliente: row.cliente ?? "Sin cliente",
        importYear: row.importYear,
        mes: row.monthIndex === null ? "Sin mes" : MONTH_LABELS[row.monthIndex] ?? "Sin mes",
        monto: row.monto,
      })),
    });
  }

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-300">
      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-3 text-sky-400">
              <div className="rounded-2xl bg-sky-500/10 p-3">
                <Layers3 className="size-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Imports AX</span>
            </div>
            <h1 className="mt-3 text-4xl font-bold text-white">Estado Comercial Actual</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Facturado, Valorización, Proyecto y Pendiente con comparativo por año y filtro mensual.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <WalletCards className="size-5 text-sky-400" />
            <p className="mt-4 text-sm text-slate-400">Monto total</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(total)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <Rows3 className="size-5 text-emerald-400" />
            <p className="mt-4 text-sm text-slate-400">Registros</p>
            <p className="mt-2 text-3xl font-bold text-white">{filteredRows.length.toLocaleString("es-PE")}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-center gap-2 px-1 text-slate-400">
            <Filter className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Filtros múltiples</span>
          </div>
          <div className="mb-4 inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => handleCompareModeChange("negocio")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                compareMode === "negocio" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Comparar por negocio
            </button>
            <button
              type="button"
              onClick={() => handleCompareModeChange("linea")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                compareMode === "linea" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              Comparar por línea
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ToggleList label="Negocios" options={summary.negocios} selected={selectedNegocios} onChange={handleNegociosChange} />
            {compareMode === "linea" ? (
              <ToggleList
                label={selectedNegocioForLines ? `Líneas de ${selectedNegocioForLines}` : "Líneas"}
                options={availableLineas}
                selected={selectedLineas}
                onChange={setSelectedLineas}
              />
            ) : null}
            <ToggleList label="Años" options={summary.years.map(String)} selected={selectedYears} onChange={setSelectedYears} />
            <ToggleList
              label="Meses"
              options={monthOptions.map((month) => month.label)}
              selected={selectedMonths.map((month) => MONTH_LABELS[Number(month)] ?? month)}
              onChange={(values) =>
                setSelectedMonths(
                  values.flatMap((value) => {
                    const option = monthOptions.find((month) => month.label === value);
                    return option ? [option.value] : [];
                  }),
                )
              }
            />
          </div>
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-8">
          <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-xl font-semibold text-white">
                {compareMode === "negocio" ? "Comparativo por año y negocio" : "Comparativo por año y línea"}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <ViewModeToggle value={comparisonView} onChange={setComparisonView} />
                <ExportExcelButton onClick={exportComparisonRows} />
              </div>
            </div>
            <div className="mt-6 min-w-0">
              {comparisonView === "table" && comparisonRows.length ? (
                <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-800">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Año</th>
                        <th className="px-5 py-4">{compareMode === "negocio" ? "Negocio" : "Línea"}</th>
                        <th className="px-5 py-4 text-right">Facturado</th>
                        <th className="px-5 py-4 text-right">Pendiente</th>
                        <th className="px-5 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {comparisonRows.map((row) => (
                        <tr key={row.name} className="hover:bg-white/5">
                          <td className="px-5 py-4 tabular-nums text-slate-300">{row.year}</td>
                          <td className="px-5 py-4 font-semibold text-white">{row.category}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-sky-300">{formatCurrency(row.facturado)}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-amber-300">{formatCurrency(row.pendiente)}</td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-white">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {comparisonView === "chart" && comparisonRows.length ? (
                <div className="max-h-[780px] overflow-auto">
                  <div style={{ height: comparisonChartHeight, minWidth: comparisonChartWidth }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={comparisonRows} layout="vertical" margin={{ top: 36, right: 96, bottom: 36, left: 36 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 14, fill: "#cbd5e1", fontWeight: 700 }} />
                        <YAxis type="category" dataKey="name" width={300} stroke="#ffffff" tickLine={false} axisLine={false} tick={{ fontSize: 14, fill: "#ffffff", fontWeight: 800 }} interval={0} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="facturado" name="Facturado" stackId="comparison" radius={[0, 8, 8, 0]} barSize={34}>
                          {comparisonRows.map((row, index) => (
                            <Cell key={`facturado-${row.name}`} fill={COMPARISON_BAR_COLORS[index % COMPARISON_BAR_COLORS.length]} />
                          ))}
                          <LabelList position="right" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={14} fontWeight={900} />
                        </Bar>
                        <Bar dataKey="pendiente" name="Pendiente" stackId="comparison" radius={[0, 8, 8, 0]} barSize={34}>
                          {comparisonRows.map((row, index) => (
                            <Cell key={`pendiente-${row.name}`} fill={COMPARISON_BAR_COLORS[index % COMPARISON_BAR_COLORS.length]} fillOpacity={0.55} />
                          ))}
                          <LabelList position="right" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={13} fontWeight={800} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
              {!comparisonRows.length ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
                  No hay datos comparables para los filtros.
                </div>
              ) : null}
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h2 className="text-xl font-semibold text-white">
                {compareMode === "negocio" ? "Monto por mes y negocio" : "Monto por mes y línea"}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <ViewModeToggle value={monthView} onChange={setMonthView} />
                <ExportExcelButton onClick={exportMonthRows} />
              </div>
            </div>
            <div className="mt-6 min-w-0">
              {monthView === "table" && monthRows.length ? (
                <div className="max-h-[620px] overflow-auto rounded-2xl border border-slate-800">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-950 text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Mes</th>
                        <th className="px-5 py-4">{compareMode === "negocio" ? "Negocio" : "Línea"}</th>
                        <th className="px-5 py-4 text-right">Facturado</th>
                        <th className="px-5 py-4 text-right">Pendiente</th>
                        <th className="px-5 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {monthRows.map((row) => (
                        <tr key={row.name} className="hover:bg-white/5">
                          <td className="px-5 py-4 tabular-nums text-slate-300">{MONTH_LABELS[row.monthIndex] ?? "Sin mes"}</td>
                          <td className="px-5 py-4 font-semibold text-white">{row.category}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-sky-300">{formatCurrency(row.facturado)}</td>
                          <td className="px-5 py-4 text-right tabular-nums text-amber-300">{formatCurrency(row.pendiente)}</td>
                          <td className="px-5 py-4 text-right font-semibold tabular-nums text-white">{formatCurrency(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {monthView === "chart" && monthRows.length ? (
                <div className="max-h-[820px] overflow-auto">
                  <div style={{ height: monthChartHeight, minWidth: monthChartWidth }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={monthRows} layout="vertical" margin={{ top: 36, right: 96, bottom: 36, left: 36 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 14, fill: "#cbd5e1", fontWeight: 700 }} />
                        <YAxis type="category" dataKey="name" width={320} stroke="#ffffff" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: "#ffffff", fontWeight: 800 }} interval={0} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="facturado" name="Facturado" stackId="month" fill={CHART_COLORS.facturado} radius={[0, 8, 8, 0]} barSize={30}>
                          <LabelList position="right" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={13} fontWeight={900} />
                        </Bar>
                        <Bar dataKey="pendiente" name="Pendiente" stackId="month" fill={CHART_COLORS.pendiente} radius={[0, 8, 8, 0]} barSize={30}>
                          <LabelList position="right" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={13} fontWeight={800} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : null}
              {!monthRows.length ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">
                  No hay datos mensuales para los filtros.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
          <div className="border-b border-slate-800 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
            <h2 className="text-xl font-semibold text-white">Detalle filtrado</h2>
            <p className="mt-1 text-sm text-slate-500">
              Primeros registros usados para este dashboard.
            </p>
              </div>
              <ExportExcelButton onClick={exportFilteredDetail} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Línea</th>
                  <th className="px-6 py-4">Negocio</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredRows.slice(0, 20).map((row, index) => (
                  <tr key={`${row.situacion}-${row.linea}-${row.cliente}-${index}`} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white">{STATUS_LABELS[row.situacion]}</td>
                    <td className="px-6 py-4">{row.linea ?? "Sin línea"}</td>
                    <td className="px-6 py-4">{row.negocio ?? "Sin negocio"}</td>
                    <td className="px-6 py-4">{row.cliente ?? "Sin cliente"}</td>
                    <td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(row.monto)}</td>
                  </tr>
                ))}
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No hay registros para el año relevante y los filtros actuales.
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

