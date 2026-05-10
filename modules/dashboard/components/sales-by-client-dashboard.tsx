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
import {
  AlertTriangle,
  Filter,
  LayoutDashboard,
  ListOrdered,
  Rows3,
  ShoppingBag,
  Table2,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";

export type SalesByClientSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  ejecutivos?: string[];
  rows: Array<{
    importYear: number | null;
    negocio: string | null;
    linea: string | null;
    ejecutivo?: string | null;
    cliente: string;
    ventasMonto: number;
  }>;
};

const CHART_COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#f97316", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16"] as const;
const LINE_LIMIT_FOR_CHART = 10;

type AbcClass = "A" | "B" | "C";
type ActiveTab = "resumen" | "compras" | "pareto" | "detalle";
type PurchaseViewMode = "chart" | "table";

type ClientAggregate = {
  cliente: string;
  ventasMonto: number;
  operaciones: number;
  abcClass: AbcClass;
  salesShare: number;
  cumulativeShare: number;
};

type ClientLineAggregate = {
  cliente: string;
  linea: string;
  negocio: string;
  ventasMonto: number;
  operaciones: number;
  salesShare: number;
};

type ClientYearLineAggregate = {
  cliente: string;
  yearLabel: string;
  linea: string;
  chartLabel: string;
  ventasMonto: number;
  operaciones: number;
};

type AxisTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value?: string;
  };
};

const mockSummary: SalesByClientSummary = {
  years: [2024, 2023],
  negocios: ["Retail", "Mayorista", "Industrial"],
  lineas: ["Linea A", "Linea B", "Linea C"],
  ejecutivos: [],
  rows: [
    { importYear: 2024, negocio: "Retail", linea: "Linea A", cliente: "Tech Solutions SAC", ventasMonto: 850000 },
    { importYear: 2024, negocio: "Mayorista", linea: "Linea B", cliente: "Global Retailers", ventasMonto: 620000 },
    { importYear: 2024, negocio: "Industrial", linea: "Linea C", cliente: "Industrias del Norte", ventasMonto: 410000 },
    { importYear: 2024, negocio: "Retail", linea: "Linea A", cliente: "Comercializadora Sur", ventasMonto: 150000 },
    { importYear: 2023, negocio: "Retail", linea: "Linea A", cliente: "Tech Solutions SAC", ventasMonto: 500000 },
  ],
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

function formatPercent(value: number | null | undefined) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function getAbcClass(cumulativeShare: number): AbcClass {
  if (cumulativeShare <= 80) return "A";
  if (cumulativeShare <= 95) return "B";
  return "C";
}

function getAbcBadgeClass(value: AbcClass) {
  if (value === "A") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";
  if (value === "B") return "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return "border-slate-600 bg-slate-800 text-slate-300";
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

function TabButton({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: typeof LayoutDashboard;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"
      }`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function EmptyState({ children = "No hay datos para los filtros actuales." }: { children?: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">{children}</div>;
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
            <span className="font-semibold text-white">{item.name?.includes("%") ? formatPercent(item.value) : formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientBreakdownTick({ x = 0, y = 0, payload }: AxisTickProps) {
  const [cliente = "", yearLabel = "", linea = ""] = String(payload?.value ?? "").split("||");

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-10} y={-10} textAnchor="end" fill="#ffffff" fontSize={15} fontWeight={900}>
        {cliente.length > 30 ? `${cliente.slice(0, 30)}...` : cliente}
      </text>
      <text x={-10} y={11} textAnchor="end" fill="#cbd5e1" fontSize={12} fontWeight={700}>
        {yearLabel} · {linea.length > 28 ? `${linea.slice(0, 28)}...` : linea}
      </text>
    </g>
  );
}

function buildClientRanking(rows: SalesByClientSummary["rows"]) {
  const aggregates = new Map<string, ClientAggregate>();

  for (const row of rows) {
    const current = aggregates.get(row.cliente) ?? {
      cliente: row.cliente,
      ventasMonto: 0,
      operaciones: 0,
      abcClass: "C" as AbcClass,
      salesShare: 0,
      cumulativeShare: 0,
    };
    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    aggregates.set(row.cliente, current);
  }

  const ranking = [...aggregates.values()].sort((a, b) => b.ventasMonto - a.ventasMonto);
  const totalVentas = ranking.reduce((sum, row) => sum + row.ventasMonto, 0);
  let cumulativeShare = 0;

  return ranking.map((row) => {
    const salesShare = totalVentas ? (row.ventasMonto / totalVentas) * 100 : 0;
    cumulativeShare += salesShare;
    return { ...row, salesShare, cumulativeShare, abcClass: getAbcClass(cumulativeShare) };
  });
}

function buildClientLineRows(rows: SalesByClientSummary["rows"]) {
  const grouped = new Map<string, ClientLineAggregate>();
  const totalVentas = rows.reduce((sum, row) => sum + row.ventasMonto, 0);

  for (const row of rows) {
    const linea = row.linea ?? "Sin linea";
    const negocio = row.negocio ?? "Sin negocio";
    const key = `${row.cliente}::${linea}::${negocio}`;
    const current = grouped.get(key) ?? {
      cliente: row.cliente,
      linea,
      negocio,
      ventasMonto: 0,
      operaciones: 0,
      salesShare: 0,
    };
    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((row) => ({ ...row, salesShare: totalVentas ? (row.ventasMonto / totalVentas) * 100 : 0 }))
    .sort((a, b) => b.ventasMonto - a.ventasMonto);
}

function buildClientYearLineRows(
  rows: SalesByClientSummary["rows"],
  clientOrder: string[],
) {
  const grouped = new Map<string, ClientYearLineAggregate>();
  const clientOrderMap = new Map(clientOrder.map((cliente, index) => [cliente, index]));

  for (const row of rows) {
    if (!clientOrderMap.has(row.cliente)) continue;

    const yearLabel = row.importYear ? String(row.importYear) : "Sin año";
    const linea = row.linea ?? "Sin linea";
    const key = `${row.cliente}::${yearLabel}::${linea}`;
    const current = grouped.get(key) ?? {
      cliente: row.cliente,
      yearLabel,
      linea,
      chartLabel: `${row.cliente}||${yearLabel}||${linea}`,
      ventasMonto: 0,
      operaciones: 0,
    };
    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((a, b) => {
    const salesDiff = b.ventasMonto - a.ventasMonto;
    if (salesDiff !== 0) return salesDiff;

    const yearDiff = Number(b.yearLabel) - Number(a.yearLabel);
    if (Number.isFinite(yearDiff) && yearDiff !== 0) return yearDiff;

    const clientDiff = (clientOrderMap.get(a.cliente) ?? 0) - (clientOrderMap.get(b.cliente) ?? 0);
    if (clientDiff !== 0) return clientDiff;

    return a.linea.localeCompare(b.linea, "es");
  });
}

export function SalesByClientDashboard({ summary = mockSummary }: { summary?: SalesByClientSummary }) {
  const [selectedYears, setSelectedYears] = useState<string[]>(summary.years[0] ? [String(summary.years[0])] : []);
  const [selectedNegocios, setSelectedNegocios] = useState<string[]>([]);
  const [selectedLineas, setSelectedLineas] = useState<string[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("resumen");
  const [topClientBreakdownViewMode, setTopClientBreakdownViewMode] = useState<PurchaseViewMode>("chart");
  const [purchaseViewMode, setPurchaseViewMode] = useState<PurchaseViewMode>("chart");

  const clientes = useMemo(
    () => [...new Set(summary.rows.map((row) => row.cliente).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [summary.rows],
  );

  const filteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedYears.length > 0 && (row.importYear === null || !selectedYears.includes(String(row.importYear)))) return false;
        if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) return false;
        if (selectedLineas.length > 0 && (!row.linea || !selectedLineas.includes(row.linea))) return false;
        if (selectedClientes.length > 0 && !selectedClientes.includes(row.cliente)) return false;
        return true;
      }),
    [selectedClientes, selectedLineas, selectedNegocios, selectedYears, summary.rows],
  );

  const clientRanking = useMemo(() => buildClientRanking(filteredRows), [filteredRows]);
  const clientLineRows = useMemo(() => buildClientLineRows(filteredRows), [filteredRows]);
  const totalVentas = clientRanking.reduce((sum, row) => sum + row.ventasMonto, 0);
  const totalOperaciones = filteredRows.length;
  const ticketPromedio = totalOperaciones ? totalVentas / totalOperaciones : 0;
  const top5Concentration = clientRanking.slice(0, 5).reduce((sum, row) => sum + row.salesShare, 0);
  const abcCounts = clientRanking.reduce(
    (acc, row) => {
      acc[row.abcClass] += 1;
      return acc;
    },
    { A: 0, B: 0, C: 0 } as Record<AbcClass, number>,
  );

  const visibleLineas = [...new Set(clientLineRows.map((row) => row.linea))];
  const shouldPreferTable = visibleLineas.length > LINE_LIMIT_FOR_CHART;
  const topClients = clientRanking.slice(0, 12);
  const topClientNames = topClients.map((row) => row.cliente);
  const topClientBreakdownRows = useMemo(
    () => buildClientYearLineRows(filteredRows, topClientNames).slice(0, 36),
    [filteredRows, topClientNames],
  );
  const topClientChartHeight = Math.max(560, topClientBreakdownRows.length * 58);
  const paretoClients = clientRanking.slice(0, 30);
  const clientLineChartRows = useMemo(() => {
    return topClientNames.map((cliente) => {
      const item: Record<string, string | number> = { cliente };
      for (const row of clientLineRows.filter((lineRow) => lineRow.cliente === cliente)) {
        item[row.linea] = (Number(item[row.linea]) || 0) + row.ventasMonto;
      }
      return item;
    });
  }, [clientLineRows, topClientNames]);

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-300">
      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-10">
        <header className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-3 text-sky-400">
              <div className="rounded-2xl bg-sky-500/10 p-3">
                <Users className="size-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Inteligencia comercial</span>
            </div>
            <h1 className="mt-3 text-4xl font-bold text-white">Analisis y Retencion de Clientes</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Cartera ABC, concentracion de riesgo y detalle de que lineas compra cada cliente.
            </p>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <WalletCards className="size-5 text-sky-400" />
            <p className="mt-4 text-sm text-slate-400">Ventas totales</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(totalVentas)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <Rows3 className="size-5 text-emerald-400" />
            <p className="mt-4 text-sm text-slate-400">Operaciones</p>
            <p className="mt-2 text-3xl font-bold text-white">{totalOperaciones.toLocaleString("es-PE")}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <ShoppingBag className="size-5 text-amber-400" />
            <p className="mt-4 text-sm text-slate-400">Ticket promedio</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrency(ticketPromedio)}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
            <AlertTriangle className={`size-5 ${top5Concentration > 50 ? "text-rose-400" : top5Concentration > 30 ? "text-amber-400" : "text-emerald-400"}`} />
            <p className="mt-4 text-sm text-slate-400">Concentracion top 5</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatPercent(top5Concentration)}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-center gap-2 px-1 text-slate-400">
            <Filter className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Filtros multiples</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ToggleList label="Años" options={summary.years.map(String)} selected={selectedYears} onChange={setSelectedYears} />
            <ToggleList label="Negocios" options={summary.negocios} selected={selectedNegocios} onChange={setSelectedNegocios} />
            <ToggleList label="Lineas" options={summary.lineas} selected={selectedLineas} onChange={setSelectedLineas} />
            <ToggleList label="Clientes" options={clientes} selected={selectedClientes} onChange={setSelectedClientes} />
          </div>
        </section>

        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-1.5">
          <TabButton active={activeTab === "resumen"} onClick={() => setActiveTab("resumen")} icon={LayoutDashboard}>
            Top clientes
          </TabButton>
          <TabButton active={activeTab === "compras"} onClick={() => setActiveTab("compras")} icon={ShoppingBag}>
            Clientes x linea
          </TabButton>
          <TabButton active={activeTab === "pareto"} onClick={() => setActiveTab("pareto")} icon={TrendingUp}>
            Pareto ABC
          </TabButton>
          <TabButton active={activeTab === "detalle"} onClick={() => setActiveTab("detalle")} icon={ListOrdered}>
            Cartera tabular
          </TabButton>
        </div>

        {activeTab === "resumen" ? (
          <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
            <h2 className="text-xl font-semibold text-white">Top clientes por año y linea</h2>
            <p className="mt-1 text-sm text-slate-500">Cada barra muestra una combinacion cliente-año-linea bajo los filtros actuales.</p>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
                <button
                  type="button"
                  onClick={() => setTopClientBreakdownViewMode("chart")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${topClientBreakdownViewMode === "chart" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <TrendingUp className="size-4" />
                  Grafico
                </button>
                <button
                  type="button"
                  onClick={() => setTopClientBreakdownViewMode("table")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${topClientBreakdownViewMode === "table" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <Table2 className="size-4" />
                  Tabla
                </button>
              </div>
            </div>
            {topClientBreakdownViewMode === "chart" ? (
            <div className="min-w-0 overflow-x-auto p-6">
              {topClientBreakdownRows.length ? (
                <div style={{ height: topClientChartHeight, minWidth: 980 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={topClientBreakdownRows} layout="vertical" margin={{ top: 24, right: 72, bottom: 24, left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 13, fill: "#cbd5e1" }} />
                    <YAxis type="category" dataKey="chartLabel" width={300} stroke="#ffffff" tickLine={false} axisLine={false} tick={<ClientBreakdownTick />} interval={0} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} labelFormatter={(value) => String(value).replace(/\|\|/g, " · ")} />
                    <Bar dataKey="ventasMonto" name="Ventas" radius={[0, 8, 8, 0]}>
                      <LabelList position="right" formatter={(value) => formatCompactCurrency(Number(value))} fill="#f8fafc" fontSize={13} fontWeight={800} />
                      {topClientBreakdownRows.map((entry) => (
                        <Cell key={entry.chartLabel} fill={CHART_COLORS[(topClientNames.indexOf(entry.cliente) >= 0 ? topClientNames.indexOf(entry.cliente) : 0) % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState />
              )}
            </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Año</th>
                      <th className="px-6 py-4">Linea</th>
                      <th className="px-6 py-4 text-right">Ventas</th>
                      <th className="px-6 py-4 text-right">Operaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {topClientBreakdownRows.length ? (
                      topClientBreakdownRows.map((row) => (
                        <tr key={row.chartLabel} className="hover:bg-white/5">
                          <td className="px-6 py-4 font-semibold text-white">{row.cliente}</td>
                          <td className="px-6 py-4 tabular-nums">{row.yearLabel}</td>
                          <td className="px-6 py-4">{row.linea}</td>
                          <td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(row.ventasMonto)}</td>
                          <td className="px-6 py-4 text-right tabular-nums">{row.operaciones}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                          No hay clientes para los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "compras" ? (
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
            <div className="flex flex-col gap-4 border-b border-slate-800 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Que compro cada cliente</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Desglose cliente-linea-negocio. Hay {visibleLineas.length} lineas visibles; usa tabla si el grafico queda muy cargado.
                </p>
              </div>
              <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
                <button
                  type="button"
                  onClick={() => setPurchaseViewMode("chart")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${purchaseViewMode === "chart" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <TrendingUp className="size-4" />
                  Grafico
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseViewMode("table")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${purchaseViewMode === "table" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/5"}`}
                >
                  <Table2 className="size-4" />
                  Tabla
                </button>
              </div>
            </div>

            {purchaseViewMode === "chart" && !shouldPreferTable ? (
              <div className="h-[680px] min-h-[680px] min-w-0 p-6">
                {clientLineChartRows.length ? (
                  <ResponsiveContainer width="100%" height={680} minWidth={0}>
                    <BarChart data={clientLineChartRows} margin={{ top: 32, right: 32, bottom: 150, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="cliente" stroke="#ffffff" tickLine={false} axisLine={false} tick={{ fontSize: 13, fill: "#ffffff", fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} height={160} />
                      <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 13, fill: "#cbd5e1" }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                      {visibleLineas.map((linea, index) => (
                        <Bar key={linea} dataKey={linea} name={linea} stackId="lineas" fill={CHART_COLORS[index % CHART_COLORS.length]} radius={[8, 8, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Linea</th>
                      <th className="px-6 py-4">Negocio</th>
                      <th className="px-6 py-4 text-right">Ventas</th>
                      <th className="px-6 py-4 text-right">Operaciones</th>
                      <th className="px-6 py-4 text-right">% cartera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {clientLineRows.length ? (
                      clientLineRows.map((row) => (
                        <tr key={`${row.cliente}-${row.linea}-${row.negocio}`} className="hover:bg-white/5">
                          <td className="px-6 py-4 font-semibold text-white">{row.cliente}</td>
                          <td className="px-6 py-4">{row.linea}</td>
                          <td className="px-6 py-4">{row.negocio}</td>
                          <td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(row.ventasMonto)}</td>
                          <td className="px-6 py-4 text-right tabular-nums">{row.operaciones}</td>
                          <td className="px-6 py-4 text-right tabular-nums">{formatPercent(row.salesShare)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                          No hay compras para los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "pareto" ? (
          <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
            <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-xl font-semibold text-white">Curva de Pareto ABC</h2>
              <p className="mt-1 text-sm text-slate-500">Clientes ordenados por ingreso y participacion acumulada.</p>
              <div className="mt-6 h-[560px] min-h-[560px] min-w-0">
                {paretoClients.length ? (
                  <ResponsiveContainer width="100%" height={560} minWidth={0}>
                    <ComposedChart data={paretoClients} margin={{ top: 32, right: 32, bottom: 150, left: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="cliente" stroke="#ffffff" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#ffffff", fontWeight: 700 }} angle={-35} textAnchor="end" interval={0} height={160} />
                      <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(value) => formatCompactCurrency(Number(value))} tick={{ fontSize: 13, fill: "#cbd5e1" }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#a3e635" tickFormatter={(value) => `${value}%`} tick={{ fontSize: 13, fill: "#a3e635" }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                      <Bar yAxisId="left" dataKey="ventasMonto" name="Ventas" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulativeShare" name="% acumulado" stroke="#a3e635" strokeWidth={3} dot={{ r: 4, fill: "#a3e635" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-xl font-semibold text-white">Resumen ABC</h2>
              <div className="mt-6 space-y-4">
                {(["A", "B", "C"] as const).map((abcClass) => {
                  const rows = clientRanking.filter((row) => row.abcClass === abcClass);
                  const sales = rows.reduce((sum, row) => sum + row.ventasMonto, 0);
                  const percentage = totalVentas ? (sales / totalVentas) * 100 : 0;
                  return (
                    <div key={abcClass} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${getAbcBadgeClass(abcClass)}`}>Clase {abcClass}</span>
                      <p className="mt-4 text-2xl font-bold text-white">{abcCounts[abcClass]} clientes</p>
                      <p className="mt-1 text-sm text-slate-500">{formatCurrency(sales)} / {formatPercent(percentage)}</p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full bg-sky-500" style={{ width: `${Math.min(percentage, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "detalle" ? (
          <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40">
            <div className="border-b border-slate-800 px-6 py-5">
              <h2 className="text-xl font-semibold text-white">Cartera filtrada</h2>
              <p className="mt-1 text-sm text-slate-500">Ranking ABC completo de clientes segun los filtros activos.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">#</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4 text-center">ABC</th>
                    <th className="px-6 py-4 text-right">Ventas</th>
                    <th className="px-6 py-4 text-right">Ticket prom.</th>
                    <th className="px-6 py-4 text-right">% cartera</th>
                    <th className="px-6 py-4 text-right">% acumulado</th>
                    <th className="px-6 py-4 text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {clientRanking.length ? (
                    clientRanking.map((row, index) => (
                      <tr key={row.cliente} className="hover:bg-white/5">
                        <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-6 py-4 font-semibold text-white">{row.cliente}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${getAbcBadgeClass(row.abcClass)}`}>{row.abcClass}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-white">{formatCurrency(row.ventasMonto)}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatCurrency(row.ventasMonto / row.operaciones)}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatPercent(row.salesShare)}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{formatPercent(row.cumulativeShare)}</td>
                        <td className="px-6 py-4 text-right tabular-nums">{row.operaciones}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                        No hay clientes para los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
