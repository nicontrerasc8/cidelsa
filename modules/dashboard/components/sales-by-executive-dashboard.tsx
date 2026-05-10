"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CircleDollarSign,
  Filter,
  ListOrdered,
  Table2,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  SalesByExecutiveRow,
  SalesByExecutiveSummary,
} from "@/modules/dashboard/services/sales-by-executive";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"] as const;
const CHART_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#a78bfa", "#fb7185", "#14b8a6", "#eab308", "#60a5fa"] as const;

type ExecutiveAggregate = {
  ejecutivo: string;
  ventasMonto: number;
  operaciones: number;
  clientes: number;
  lineas: number;
  ticketPromedio: number;
  share: number;
  bestLinea: string;
  bestLineaVentas: number;
  bestCliente: string;
  bestClienteVentas: number;
};

type ExecutiveLineAggregate = {
  ejecutivo: string;
  linea: string;
  label: string;
  ventasMonto: number;
  operaciones: number;
  clientes: number;
  ticketPromedio: number;
};

type ExecutiveYearLineAggregate = {
  ejecutivo: string;
  yearLabel: string;
  linea: string;
  chartLabel: string;
  ventasMonto: number;
  operaciones: number;
};

type MonthlyLineExecutiveRow = {
  key: string;
  ejecutivo: string;
  linea: string;
  months: number[];
  total: number;
};

type RankingTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value?: string;
  };
};

type RankingViewMode = "chart" | "table";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
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
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value)}%`;
}

function sortText(a: string, b: string) {
  return a.localeCompare(b, "es");
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
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <div className="min-w-[220px] flex-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-sky-400 hover:text-sky-300">
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
                active ? "border-sky-400 bg-sky-500 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
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

function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/20 ${className}`}>
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
  icon: React.ReactNode;
}) {
  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
          {icon}
        </div>
      </div>
    </Surface>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-52 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string; payload?: unknown }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      {label ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-6 text-sm">
            <span className="text-slate-300">{item.name}</span>
            <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getKnownLineas(rows: SalesByExecutiveRow[], selectedNegocios: string[]) {
  const lineas = new Set<string>();
  for (const row of rows) {
    if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) continue;
    if (row.linea) lineas.add(row.linea);
  }
  return [...lineas].sort(sortText);
}

function aggregateExecutives(rows: SalesByExecutiveRow[]): ExecutiveAggregate[] {
  const map = new Map<
    string,
    {
      ventasMonto: number;
      operaciones: number;
      clientes: Set<string>;
      lineas: Set<string>;
      ventasPorLinea: Map<string, number>;
      ventasPorCliente: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const current =
      map.get(row.ejecutivo) ??
      {
        ventasMonto: 0,
        operaciones: 0,
        clientes: new Set<string>(),
        lineas: new Set<string>(),
        ventasPorLinea: new Map<string, number>(),
        ventasPorCliente: new Map<string, number>(),
      };
    const linea = row.linea ?? "Sin linea";
    const cliente = row.cliente ?? "Sin cliente";

    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    current.clientes.add(cliente);
    current.lineas.add(linea);
    current.ventasPorLinea.set(linea, (current.ventasPorLinea.get(linea) ?? 0) + row.ventasMonto);
    current.ventasPorCliente.set(cliente, (current.ventasPorCliente.get(cliente) ?? 0) + row.ventasMonto);
    map.set(row.ejecutivo, current);
  }

  const total = [...map.values()].reduce((sum, item) => sum + item.ventasMonto, 0);

  return [...map.entries()]
    .map(([ejecutivo, data]) => {
      const bestLinea = [...data.ventasPorLinea.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin linea", 0];
      const bestCliente = [...data.ventasPorCliente.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin cliente", 0];

      return {
        ejecutivo,
        ventasMonto: data.ventasMonto,
        operaciones: data.operaciones,
        clientes: data.clientes.size,
        lineas: data.lineas.size,
        ticketPromedio: data.operaciones ? data.ventasMonto / data.operaciones : 0,
        share: total ? (data.ventasMonto / total) * 100 : 0,
        bestLinea: bestLinea[0],
        bestLineaVentas: bestLinea[1],
        bestCliente: bestCliente[0],
        bestClienteVentas: bestCliente[1],
      };
    })
    .filter((row) => row.ventasMonto !== 0)
    .sort((a, b) => b.ventasMonto - a.ventasMonto);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function aggregateExecutiveLines(rows: SalesByExecutiveRow[]): ExecutiveLineAggregate[] {
  const map = new Map<
    string,
    {
      ejecutivo: string;
      linea: string;
      ventasMonto: number;
      operaciones: number;
      clientes: Set<string>;
    }
  >();

  for (const row of rows) {
    const linea = row.linea ?? "Sin linea";
    const key = `${row.ejecutivo}::${linea}`;
    const current =
      map.get(key) ??
      {
        ejecutivo: row.ejecutivo,
        linea,
        ventasMonto: 0,
        operaciones: 0,
        clientes: new Set<string>(),
      };

    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    if (row.cliente) current.clientes.add(row.cliente);
    map.set(key, current);
  }

  return [...map.values()]
    .map((row) => ({
      ejecutivo: row.ejecutivo,
      linea: row.linea,
      label: `${row.ejecutivo} · ${row.linea}`,
      ventasMonto: row.ventasMonto,
      operaciones: row.operaciones,
      clientes: row.clientes.size,
      ticketPromedio: row.operaciones ? row.ventasMonto / row.operaciones : 0,
    }))
    .filter((row) => row.ventasMonto !== 0)
    .sort((a, b) => b.ventasMonto - a.ventasMonto);
}

function aggregateExecutiveYearLines(
  rows: SalesByExecutiveRow[],
  executiveOrder: string[],
): ExecutiveYearLineAggregate[] {
  const grouped = new Map<string, ExecutiveYearLineAggregate>();
  const orderMap = new Map(executiveOrder.map((ejecutivo, index) => [ejecutivo, index]));

  for (const row of rows) {
    if (!orderMap.has(row.ejecutivo)) continue;

    const yearLabel = row.importYear ? String(row.importYear) : "Sin anio";
    const linea = row.linea ?? "Sin linea";
    const key = `${row.ejecutivo}::${yearLabel}::${linea}`;
    const current =
      grouped.get(key) ??
      {
        ejecutivo: row.ejecutivo,
        yearLabel,
        linea,
        chartLabel: `${row.ejecutivo}||${yearLabel}||${linea}`,
        ventasMonto: 0,
        operaciones: 0,
      };

    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((a, b) => {
    const amountDiff = b.ventasMonto - a.ventasMonto;
    if (amountDiff !== 0) return amountDiff;

    const yearDiff = Number(b.yearLabel) - Number(a.yearLabel);
    if (Number.isFinite(yearDiff) && yearDiff !== 0) return yearDiff;

    const executiveDiff = (orderMap.get(a.ejecutivo) ?? 0) - (orderMap.get(b.ejecutivo) ?? 0);
    if (executiveDiff !== 0) return executiveDiff;

    return a.linea.localeCompare(b.linea, "es");
  });
}

function RankingBreakdownTick({ x = 0, y = 0, payload }: RankingTickProps) {
  const [ejecutivo = "", yearLabel = "", linea = ""] = String(payload?.value ?? "").split("||");

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={-8} textAnchor="end" fill="#f8fafc" fontSize={12} fontWeight={800}>
        {ejecutivo.length > 28 ? `${ejecutivo.slice(0, 28)}...` : ejecutivo}
      </text>
      <text x={-10} y={10} textAnchor="end" fill="#94a3b8" fontSize={11} fontWeight={600}>
        {yearLabel} · {linea.length > 30 ? `${linea.slice(0, 30)}...` : linea}
      </text>
    </g>
  );
}

export function SalesByExecutiveDashboard({
  summary,
}: {
  summary: SalesByExecutiveSummary;
}) {
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedNegocios, setSelectedNegocios] = useState<string[]>([]);
  const [selectedLineas, setSelectedLineas] = useState<string[]>([]);
  const [selectedEjecutivos, setSelectedEjecutivos] = useState<string[]>([]);
  const [rankingViewMode, setRankingViewMode] = useState<RankingViewMode>("chart");

  const availableLineas = useMemo(
    () => getKnownLineas(summary.rows, selectedNegocios),
    [selectedNegocios, summary.rows],
  );

  const baseRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedYears.length > 0 && !selectedYears.includes(String(row.importYear))) return false;
        if (selectedMonths.length > 0 && (row.monthIndex === null || !selectedMonths.includes(String(row.monthIndex)))) return false;
        if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) return false;
        if (selectedLineas.length > 0 && (!row.linea || !selectedLineas.includes(row.linea))) return false;
        return true;
      }),
    [selectedLineas, selectedMonths, selectedNegocios, selectedYears, summary.rows],
  );

  const availableEjecutivos = useMemo(() => {
    const ejecutivos = new Set<string>();
    for (const row of baseRows) ejecutivos.add(row.ejecutivo);
    return [...ejecutivos].sort(sortText);
  }, [baseRows]);

  const filteredRows = useMemo(
    () =>
      selectedEjecutivos.length === 0
        ? baseRows
        : baseRows.filter((row) => selectedEjecutivos.includes(row.ejecutivo)),
    [baseRows, selectedEjecutivos],
  );

  const executiveRanking = useMemo(() => aggregateExecutives(filteredRows), [filteredRows]);
  const topExecutiveNames = executiveRanking.slice(0, 10).map((row) => row.ejecutivo);
  const executiveYearLineRanking = useMemo(
    () => aggregateExecutiveYearLines(filteredRows, topExecutiveNames).slice(0, 40),
    [filteredRows, topExecutiveNames],
  );
  const rankingChartHeight = Math.max(520, executiveYearLineRanking.length * 58);
  const totalVentas = executiveRanking.reduce((sum, row) => sum + row.ventasMonto, 0);
  const totalOperaciones = executiveRanking.reduce((sum, row) => sum + row.operaciones, 0);
  const totalClientes = new Set(filteredRows.map((row) => row.cliente).filter(Boolean)).size;
  const ticketPromedio = totalOperaciones ? totalVentas / totalOperaciones : 0;
  const leader = executiveRanking[0] ?? null;
  const executiveColorMap = new Map(
    executiveRanking.map((row, index) => [row.ejecutivo, CHART_COLORS[index % CHART_COLORS.length]]),
  );

  const monthOptions = MONTH_LABELS.map((label, index) => ({ label, value: String(index) }));
  const visibleExecutivesForMonthly = selectedEjecutivos.length
    ? selectedEjecutivos
    : executiveRanking.slice(0, 6).map((row) => row.ejecutivo);
  const visibleMonthIndexes = selectedMonths.length
    ? selectedMonths.map(Number).sort((a, b) => a - b)
    : MONTH_LABELS.map((_, index) => index);
  const monthlyExecutiveRows = useMemo(() => {
    return visibleMonthIndexes.map((monthIndex) => {
      const item: Record<string, string | number> = { month: MONTH_LABELS[monthIndex] ?? String(monthIndex + 1) };

      for (const ejecutivo of visibleExecutivesForMonthly) {
        item[ejecutivo] = filteredRows
          .filter((row) => row.monthIndex === monthIndex && row.ejecutivo === ejecutivo)
          .reduce((sum, row) => sum + row.ventasMonto, 0);
      }

      return item;
    });
  }, [filteredRows, visibleExecutivesForMonthly, visibleMonthIndexes]);

  const monthlyLineExecutiveRows = useMemo<MonthlyLineExecutiveRow[]>(() => {
    const grouped = new Map<string, MonthlyLineExecutiveRow>();

    for (const row of filteredRows) {
      if (row.monthIndex === null) continue;
      if (!visibleMonthIndexes.includes(row.monthIndex)) continue;

      const linea = row.linea ?? "Sin linea";
      const key = `${linea}::${row.ejecutivo}`;
      const current =
        grouped.get(key) ??
        {
          key,
          ejecutivo: row.ejecutivo,
          linea,
          months: new Array(12).fill(0) as number[],
          total: 0,
        };

      current.months[row.monthIndex] += row.ventasMonto;
      current.total += row.ventasMonto;
      grouped.set(key, current);
    }

    return [...grouped.values()].filter((row) => row.total !== 0).sort((a, b) => b.total - a.total).slice(0, 40);
  }, [filteredRows, visibleMonthIndexes]);

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-300">
      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-3 text-sky-400">
              <div className="rounded-2xl bg-sky-500/10 p-3">
                <UsersRound className="size-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Performance comercial</span>
            </div>
            <h1 className="mt-3 text-4xl font-bold text-white">Ejecutivos de venta</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Ranking y lectura operativa usando solo ventas facturadas de la tabla imports: monto, operaciones, clientes, lineas y evolucion mensual.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-center gap-2 px-1 text-slate-400">
            <Filter className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Filtros multiples</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <ToggleList label="Anios" options={summary.years.map(String)} selected={selectedYears} onChange={setSelectedYears} />
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
            <ToggleList
              label="Negocios"
              options={summary.negocios}
              selected={selectedNegocios}
              onChange={(values) => {
                setSelectedNegocios(values);
                setSelectedLineas([]);
                setSelectedEjecutivos([]);
              }}
            />
            <ToggleList
              label="Lineas"
              options={availableLineas}
              selected={selectedLineas}
              onChange={(values) => {
                setSelectedLineas(values);
                setSelectedEjecutivos([]);
              }}
            />
            <ToggleList label="Ejecutivos" options={availableEjecutivos} selected={selectedEjecutivos} onChange={setSelectedEjecutivos} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Venta facturada" value={formatCurrency(totalVentas)} subtitle={`${formatNumber(totalOperaciones)} operaciones facturadas`} icon={<CircleDollarSign className="size-5" />} />
          <KpiCard title="Ticket promedio" value={formatCurrency(ticketPromedio)} subtitle="Venta promedio por fila facturada" icon={<Target className="size-5" />} />
          <KpiCard title="Clientes atendidos" value={formatNumber(totalClientes)} subtitle="Clientes unicos visibles" icon={<UsersRound className="size-5" />} />
          <KpiCard title="Lider visible" value={leader?.ejecutivo ?? "-"} subtitle={leader ? `${formatPercent(leader.share)} del total filtrado` : "Sin ventas visibles"} icon={<Trophy className="size-5" />} />
        </section>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-1.5">
            <TabsTrigger value="ranking" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <BarChart3 className="size-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="mensual" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <Target className="size-4" />
              Mensual
            </TabsTrigger>
            <TabsTrigger value="detalle" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <ListOrdered className="size-4" />
              Detalle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="m-0">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
              <Surface className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Ranking por año y linea</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Cada fila muestra una combinacion ejecutivo-año-linea, ordenada de mayor a menor venta.
                    </p>
                  </div>
                  <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
                    <button
                      type="button"
                      onClick={() => setRankingViewMode("chart")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${rankingViewMode === "chart" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      <BarChart3 className="size-4" />
                      Grafico
                    </button>
                    <button
                      type="button"
                      onClick={() => setRankingViewMode("table")}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${rankingViewMode === "table" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                    >
                      <Table2 className="size-4" />
                      Tabla
                    </button>
                  </div>
                </div>

                {rankingViewMode === "chart" ? (
                  <div className="mt-6 overflow-x-auto">
                    {executiveYearLineRanking.length ? (
                      <div style={{ height: rankingChartHeight, minWidth: 980 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={executiveYearLineRanking} layout="vertical" margin={{ left: 30, right: 72, top: 20, bottom: 20 }}>
                            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(Number(value))} stroke="#64748b" tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="chartLabel" width={300} stroke="#94a3b8" tickLine={false} axisLine={false} tick={<RankingBreakdownTick />} interval={0} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="ventasMonto" name="Venta facturada" radius={[0, 8, 8, 0]}>
                              {executiveYearLineRanking.map((entry) => (
                                <Cell key={entry.chartLabel} fill={executiveColorMap.get(entry.ejecutivo) ?? "#38bdf8"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <EmptyState>No hay ventas facturadas para los filtros seleccionados.</EmptyState>
                    )}
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full min-w-[900px] whitespace-nowrap text-left text-sm">
                      <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-6 py-4">#</th>
                          <th className="px-6 py-4">Ejecutivo</th>
                          <th className="px-6 py-4">Año</th>
                          <th className="px-6 py-4">Linea</th>
                          <th className="px-6 py-4 text-right">Venta</th>
                          <th className="px-6 py-4 text-right">Operaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {executiveYearLineRanking.length ? (
                          executiveYearLineRanking.map((row, index) => (
                            <tr key={row.chartLabel} className="hover:bg-white/5">
                              <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                              <td className="px-6 py-4 font-medium text-white">{row.ejecutivo}</td>
                              <td className="px-6 py-4 text-slate-300">{row.yearLabel}</td>
                              <td className="px-6 py-4 text-slate-300">{row.linea}</td>
                              <td className="px-6 py-4 text-right font-semibold text-sky-300">{formatCurrency(row.ventasMonto)}</td>
                              <td className="px-6 py-4 text-right tabular-nums text-slate-300">{formatNumber(row.operaciones)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                              No hay ventas facturadas para los filtros seleccionados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </Surface>

              <Surface className="p-6">
                <h2 className="text-xl font-semibold text-white">Podio</h2>
                <p className="mt-1 text-sm text-slate-500">Lideres visibles y su foco comercial.</p>
                <div className="mt-5 space-y-4">
                  {executiveRanking.slice(0, 3).map((row, index) => (
                    <div key={row.ejecutivo} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{row.ejecutivo}</p>
                          <p className="mt-1 text-2xl font-bold text-sky-300">{formatCompactCurrency(row.ventasMonto)}</p>
                        </div>
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">#{index + 1}</span>
                      </div>
                      <div className="mt-4 space-y-1 text-xs text-slate-400">
                        <p>Linea fuerte: <span className="text-slate-200">{row.bestLinea}</span></p>
                        <p>Cliente principal: <span className="text-slate-200">{row.bestCliente}</span></p>
                        <p>Share visible: <span className="font-medium text-emerald-400">{formatPercent(row.share)}</span></p>
                      </div>
                    </div>
                  ))}
                  {!executiveRanking.length ? <EmptyState>Sin podio para los filtros actuales.</EmptyState> : null}
                </div>
              </Surface>
            </div>
          </TabsContent>

          <TabsContent value="mensual" className="m-0">
            <div className="space-y-6">
              <Surface className="p-6">
                <h2 className="text-xl font-semibold text-white">Comparativo mensual por ejecutivo</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Compara mes a mes los ejecutivos seleccionados. Si no seleccionas ejecutivos, se muestran los 6 principales del ranking visible.
                </p>
                <div className="mt-6 h-[460px]">
                  {visibleExecutivesForMonthly.length && monthlyExecutiveRows.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={monthlyExecutiveRows} margin={{ right: 24, left: 8 }}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} stroke="#64748b" tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        {visibleExecutivesForMonthly.map((ejecutivo, index) => (
                          <Line
                            key={ejecutivo}
                            type="monotone"
                            dataKey={ejecutivo}
                            name={ejecutivo}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={3}
                            dot={{ r: 4, fill: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState>No hay ejecutivos con ventas mensuales para comparar.</EmptyState>
                  )}
                </div>
              </Surface>

              <Surface className="overflow-hidden">
                <div className="border-b border-slate-800 px-6 py-5">
                  <h2 className="text-xl font-semibold text-white">Tabla mensual por linea y ejecutivo</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Cruce de ventas facturadas por linea, ejecutivo y mes para comparar cobertura y consistencia.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] whitespace-nowrap text-left text-sm">
                    <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="sticky left-0 z-10 border-r border-slate-800 bg-slate-950 px-6 py-4">Linea</th>
                        <th className="sticky left-[220px] z-10 border-r border-slate-800 bg-slate-950 px-6 py-4">Ejecutivo</th>
                        {visibleMonthIndexes.map((monthIndex) => (
                          <th key={monthIndex} className="px-4 py-4 text-right">{MONTH_LABELS[monthIndex]}</th>
                        ))}
                        <th className="px-6 py-4 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {monthlyLineExecutiveRows.length ? (
                        monthlyLineExecutiveRows.map((row) => (
                          <tr key={row.key} className="hover:bg-white/5">
                            <td className="sticky left-0 z-10 max-w-[220px] truncate border-r border-slate-800 bg-slate-900 px-6 py-4 font-medium text-white">{row.linea}</td>
                            <td className="sticky left-[220px] z-10 max-w-[220px] truncate border-r border-slate-800 bg-slate-900 px-6 py-4 text-slate-200">{row.ejecutivo}</td>
                            {visibleMonthIndexes.map((monthIndex) => (
                              <td key={monthIndex} className="px-4 py-4 text-right tabular-nums text-slate-300">
                                {row.months[monthIndex] ? formatCompactCurrency(row.months[monthIndex]) : "-"}
                              </td>
                            ))}
                            <td className="px-6 py-4 text-right font-semibold tabular-nums text-sky-300">{formatCurrency(row.total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={visibleMonthIndexes.length + 3} className="px-6 py-12 text-center text-slate-500">
                            No hay ventas mensuales por linea para los filtros actuales.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Surface>
            </div>
          </TabsContent>

          <TabsContent value="detalle" className="m-0">
            <Surface className="overflow-hidden">
              <div className="border-b border-slate-800 px-6 py-5">
                <h2 className="text-xl font-semibold text-white">Resumen por ejecutivo</h2>
                <p className="mt-1 text-sm text-slate-500">Detalle agregado desde filas facturadas de imports.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Ejecutivo</th>
                      <th className="px-6 py-4 text-right">Venta</th>
                      <th className="px-6 py-4 text-right">Share</th>
                      <th className="px-6 py-4 text-right">Operaciones</th>
                      <th className="px-6 py-4 text-right">Clientes</th>
                      <th className="px-6 py-4 text-right">Ticket</th>
                      <th className="px-6 py-4 text-right">Linea fuerte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {executiveRanking.length ? (
                      executiveRanking.map((row, index) => (
                        <tr key={row.ejecutivo} className="hover:bg-white/5">
                          <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4 font-medium text-white">{row.ejecutivo}</td>
                          <td className="px-6 py-4 text-right font-semibold text-sky-300">{formatCurrency(row.ventasMonto)}</td>
                          <td className="px-6 py-4 text-right text-emerald-300">{formatPercent(row.share)}</td>
                          <td className="px-6 py-4 text-right text-slate-300">{formatNumber(row.operaciones)}</td>
                          <td className="px-6 py-4 text-right text-slate-300">{formatNumber(row.clientes)}</td>
                          <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(row.ticketPromedio)}</td>
                          <td className="px-6 py-4 text-right text-slate-400">
                            {row.bestLinea} <span className="text-slate-600">({formatCompactCurrency(row.bestLineaVentas)})</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                          No hay ejecutivos para mostrar con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Surface>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
