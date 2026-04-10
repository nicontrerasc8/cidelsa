"use client";

import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Filter,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  PackageOpen,
  PieChart as PieChartIcon,
  Target,
  TrendingUp,
} from "lucide-react";

import type { VariationsSummary } from "@/modules/dashboard/services/variations";

const ALL_VALUE = "__all__";
const MONTH_ORDER = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];
const CHART_COLORS = ["#38bdf8", "#818cf8", "#fb7185", "#facc15", "#a3e635", "#22d3ee", "#c084fc", "#f97316"] as const;

type VariationRow = VariationsSummary["rows"][number];
type Totals = { ventas: number; margen: number };
type MetricRow = { name: string; ventas: number; margen: number; margenPct: number };
type TabId = "insights" | "matrix" | "table";
type ColorTone = "blue" | "emerald" | "amber" | "rose";

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatFullCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}%`;
}

function marginPct(margen: number, ventas: number) {
  return ventas ? (margen / ventas) * 100 : 0;
}

function sortPeriodNames(a: string, b: string) {
  const indexA = MONTH_ORDER.indexOf(a);
  const indexB = MONTH_ORDER.indexOf(b);
  if (indexA !== -1 || indexB !== -1) return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  return a.localeCompare(b, "es");
}

function sumRows(rows: VariationRow[]): Totals {
  return rows.reduce<Totals>((acc, row) => ({ ventas: acc.ventas + row.currentReal, margen: acc.margen + (row.grossMargin ?? 0) }), { ventas: 0, margen: 0 });
}

function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function buildMetricRows(rows: VariationRow[], keySelector: (row: VariationRow) => string | null | undefined) {
  const grouped = new Map<string, Totals>();
  for (const row of rows) {
    const key = keySelector(row) || "Sin dato";
    const current = grouped.get(key) ?? { ventas: 0, margen: 0 };
    current.ventas += row.currentReal;
    current.margen += row.grossMargin ?? 0;
    grouped.set(key, current);
  }
  return [...grouped.entries()]
    .map<MetricRow>(([name, totals]) => ({ name, ventas: totals.ventas, margen: totals.margen, margenPct: marginPct(totals.margen, totals.ventas) }))
    .sort((a, b) => b.ventas - a.ventas);
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md transition-all duration-300 hover:border-slate-700/50 ${className}`}>{children}</div>;
}

function KpiCard({ title, value, icon: Icon, trend, subtext, color = "blue" }: { title: string; value: string | number; icon: LucideIcon; trend?: number | null; subtext: string; color?: ColorTone }) {
  const colorMap: Record<ColorTone, string> = {
    blue: "from-blue-500/20 to-transparent text-blue-400 border-blue-500/20",
    emerald: "from-emerald-500/20 to-transparent text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/20 to-transparent text-amber-400 border-amber-500/20",
    rose: "from-rose-500/20 to-transparent text-rose-400 border-rose-500/20",
  };

  return (
    <Card className="p-6">
      <div className={`absolute right-0 top-0 h-24 w-24 bg-gradient-to-br opacity-20 ${colorMap[color]}`} />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={`rounded-2xl border p-3 ${colorMap[color]}`}><Icon size={24} /></div>
          {trend !== undefined && trend !== null ? (
            <div className={`flex items-center gap-1 text-sm font-bold ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {trend >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <h3 className="mt-1 text-2xl font-bold text-white">{value}</h3>
          <p className="mt-1 text-xs text-slate-500">{subtext}</p>
        </div>
      </div>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl">
      {label ? <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((item) => {
          const name = String(item.name ?? "Valor");
          return (
            <div key={`${name}-${item.value}`} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} /><span className="text-sm text-slate-300">{name}</span></div>
              <span className="text-sm font-bold text-white">{name.includes("%") || name === "Crecimiento" ? formatPercent(item.value) : formatCurrency(item.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string }>; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-white outline-none ring-blue-500 transition-all focus:ring-2">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800 text-sm text-slate-500">{children}</div>;
}

export function VariationsDashboard({ summary }: { summary: VariationsSummary }) {
  const [selectedYear, setSelectedYear] = useState(ALL_VALUE);
  const [selectedPeriod, setSelectedPeriod] = useState(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState(ALL_VALUE);
  const [selectedGroup, setSelectedGroup] = useState(ALL_VALUE);
  const [activeTab, setActiveTab] = useState<TabId>("insights");

  const selectedYearNumber = selectedYear === ALL_VALUE ? null : Number(selectedYear);

  const filteredRows = useMemo(() => summary.rows.filter((row) => {
    if (selectedYearNumber !== null && row.importYear !== selectedYearNumber) return false;
    if (selectedPeriod !== ALL_VALUE && row.periodo !== selectedPeriod) return false;
    if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
    if (selectedGroup !== ALL_VALUE && row.grupo !== selectedGroup) return false;
    return true;
  }), [selectedGroup, selectedNegocio, selectedPeriod, selectedYearNumber, summary.rows]);

  const comparisonRows = useMemo(() => {
    const comparisonYear = selectedYearNumber !== null ? selectedYearNumber - 1 : (summary.years[0] ?? 0) - 1;
    if (!comparisonYear) return [];
    return summary.rows.filter((row) => {
      if (row.importYear !== comparisonYear) return false;
      if (selectedPeriod !== ALL_VALUE && row.periodo !== selectedPeriod) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedGroup !== ALL_VALUE && row.grupo !== selectedGroup) return false;
      return true;
    });
  }, [selectedGroup, selectedNegocio, selectedPeriod, selectedYearNumber, summary.rows, summary.years]);

  const metrics = useMemo(() => {
    const totals = sumRows(filteredRows);
    const comparisonTotals = sumRows(comparisonRows);
    const business = buildMetricRows(filteredRows, (row) => row.negocio);
    const groups = buildMetricRows(filteredRows, (row) => row.grupo);

    const evolutionSource = selectedYearNumber === null
      ? summary.rows.filter((row) => {
          if (selectedPeriod !== ALL_VALUE && row.periodo !== selectedPeriod) return false;
          if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
          if (selectedGroup !== ALL_VALUE && row.grupo !== selectedGroup) return false;
          return true;
        })
      : filteredRows;

    const evolution = buildMetricRows(evolutionSource, (row) => selectedYearNumber === null ? String(row.importYear) : row.periodo)
      .sort((a, b) => selectedYearNumber === null ? Number(a.name) - Number(b.name) : sortPeriodNames(a.name, b.name));

    const avgMarginPct = marginPct(totals.margen, totals.ventas);
    const comparisonMarginPct = marginPct(comparisonTotals.margen, comparisonTotals.ventas);

    return {
      totalSales: totals.ventas,
      totalMargin: totals.margen,
      avgMarginPct,
      salesTrend: percentChange(totals.ventas, comparisonTotals.ventas),
      marginTrend: percentChange(totals.margen, comparisonTotals.margen),
      efficiencyTrend: comparisonMarginPct ? avgMarginPct - comparisonMarginPct : null,
      business,
      evolution,
      groups,
    };
  }, [comparisonRows, filteredRows, selectedGroup, selectedNegocio, selectedPeriod, selectedYearNumber, summary.rows]);

  const topSalesGroup = metrics.groups[0];
  const topMarginGroup = [...metrics.groups].sort((a, b) => b.margenPct - a.margenPct)[0];
  const yearOptions = useMemo(() => [{ label: "Historico", value: ALL_VALUE }, ...summary.years.map((year) => ({ label: String(year), value: String(year) }))], [summary.years]);
  const periodOptions = useMemo(() => [{ label: "Todos los meses", value: ALL_VALUE }, ...summary.periodos.map((periodo) => ({ label: periodo, value: periodo }))], [summary.periodos]);
  const negocioOptions = useMemo(() => [{ label: "Todos los negocios", value: ALL_VALUE }, ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio }))], [summary.negocios]);
  const groupOptions = useMemo(() => [{ label: "Todos los grupos", value: ALL_VALUE }, ...summary.grupos.map((grupo) => ({ label: grupo, value: grupo }))], [summary.grupos]);
  const tabs: Array<{ id: TabId; label: string; icon: ComponentType<{ size?: number }> }> = [
    { id: "insights", label: "Dashboard General", icon: LayoutDashboard },
    { id: "matrix", label: "Matriz Estrategica", icon: Target },
    { id: "table", label: "Detalle Transaccional", icon: ListOrdered },
  ];

  return (
    <div className="min-h-screen bg-[#05080f] text-slate-300 selection:bg-blue-500/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-[10%] top-[20%] h-[30%] w-[30%] rounded-full bg-indigo-600/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-[1400px] px-6 py-10">
        <header className="mb-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-blue-400"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><LayoutDashboard size={24} /></div><span className="text-sm font-bold uppercase tracking-widest">Business Intelligence</span></div>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">Analisis de Variaciones</h1>
            <p className="mt-2 text-slate-400">Monitoreo de rentabilidad y eficiencia operativa con datos contables reales.</p>
          </div>

          <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-800 bg-slate-900/50 p-2 backdrop-blur-md">
            <div className="flex items-center gap-2 px-3 py-2 text-slate-500"><Filter size={18} /><span className="text-xs font-bold uppercase">Filtros</span></div>
            <SelectFilter label="Año" value={selectedYear} onChange={setSelectedYear} options={yearOptions} />
            <SelectFilter label="Periodo" value={selectedPeriod} onChange={setSelectedPeriod} options={periodOptions} />
            <SelectFilter label="Negocio" value={selectedNegocio} onChange={setSelectedNegocio} options={negocioOptions} />
            <SelectFilter label="Grupo" value={selectedGroup} onChange={setSelectedGroup} options={groupOptions} />
          </div>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Ventas Totales" value={formatFullCurrency(metrics.totalSales)} icon={BarChart3} trend={metrics.salesTrend} subtext="vs año anterior comparable" color="blue" />
          <KpiCard title="Margen Bruto" value={formatFullCurrency(metrics.totalMargin)} icon={TrendingUp} trend={metrics.marginTrend} subtext="Ganancia operativa" color="emerald" />
          <KpiCard title="Eficiencia M.B." value={formatPercent(metrics.avgMarginPct)} icon={PieChartIcon} trend={metrics.efficiencyTrend} subtext="Puntos vs año anterior" color="amber" />
          <KpiCard title="Grupos de Negocio" value={metrics.groups.length} icon={PackageOpen} subtext="Unidades operativas visibles" color="rose" />
        </div>

        <div className="mb-6 flex w-fit gap-1 rounded-2xl border border-slate-800 bg-slate-900/30 p-1">
          {tabs.map((tab) => { const Icon = tab.icon; return <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-slate-800 hover:text-white"}`}><Icon size={18} />{tab.label}</button>; })}
        </div>

        <main className="min-h-[600px]">
          {activeTab === "insights" ? (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <Card className="lg:col-span-8">
                <div className="p-8 pb-0"><h3 className="text-xl font-bold text-white">Evolucion Comercial</h3><p className="text-sm text-slate-500">Volumen de ventas contra margen porcentual por periodo.</p></div>
                <div className="h-[400px] w-full p-4">
                  {metrics.evolution.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={metrics.evolution}><defs><linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={1} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} /><XAxis dataKey="name" stroke="#64748b" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} /><YAxis yAxisId="left" stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fontSize: 12 }} /><YAxis yAxisId="right" orientation="right" stroke="#10b981" axisLine={false} tickLine={false} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} /><Tooltip content={<CustomTooltip />} /><Bar yAxisId="left" dataKey="ventas" name="Ventas" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={40} /><Line yAxisId="right" type="monotone" dataKey="margenPct" name="Margen %" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: "#0f172a", strokeWidth: 3 }} /></ComposedChart></ResponsiveContainer> : <EmptyState>No hay datos para los filtros seleccionados.</EmptyState>}
                </div>
              </Card>

              <Card className="lg:col-span-4">
                <div className="p-8 pb-0 text-center"><h3 className="text-xl font-bold text-white">Share por Negocio</h3><p className="text-sm text-slate-500">Distribucion porcentual de ingresos.</p></div>
                <div className="h-[350px] w-full">
                  {metrics.business.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={metrics.business} innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="ventas" nameKey="name">{metrics.business.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer> : <EmptyState>No hay negocios visibles.</EmptyState>}
                </div>
                <div className="flex flex-wrap justify-center gap-4 p-6 pt-0">{metrics.business.map((business, index) => <div key={business.name} className="flex items-center gap-2"><div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="text-xs font-medium">{business.name}</span></div>)}</div>
              </Card>

              <div className="grid grid-cols-1 gap-6 lg:col-span-12 md:grid-cols-3">
                <Card className="border-l-4 border-l-blue-500 p-6"><div className="flex items-start gap-4"><div className="rounded-full bg-blue-500/10 p-3 text-blue-400"><Lightbulb size={24} /></div><div><h4 className="font-bold text-white">Lider de Ventas</h4><p className="mt-1 text-sm text-slate-400">{topSalesGroup?.name ?? "N/A"} concentra el mayor volumen.</p></div></div></Card>
                <Card className="border-l-4 border-l-emerald-500 p-6"><div className="flex items-start gap-4"><div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400"><TrendingUp size={24} /></div><div><h4 className="font-bold text-white">Top Eficiencia</h4><p className="mt-1 text-sm text-slate-400">{topMarginGroup?.name ?? "N/A"} tiene el mejor margen.</p></div></div></Card>
                <Card className="border-l-4 border-l-amber-500 p-6"><div className="flex items-start gap-4"><div className="rounded-full bg-amber-500/10 p-3 text-amber-400"><AlertCircle size={24} /></div><div><h4 className="font-bold text-white">Promedio Global</h4><p className="mt-1 text-sm text-slate-400">El margen medio de la operacion es {formatPercent(metrics.avgMarginPct)}.</p></div></div></Card>
              </div>
            </div>
          ) : null}

          {activeTab === "matrix" ? (
            <Card className="p-8">
              <div className="mb-8"><h3 className="text-2xl font-bold text-white">Matriz de Segmentacion Estrategica</h3><p className="mt-2 text-slate-500">Correlacion entre volumen de ventas y rentabilidad.</p><div className="mt-4 flex flex-wrap gap-6"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-emerald-500" /><span className="text-xs">Sobre promedio</span></div><div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-rose-500" /><span className="text-xs">Bajo promedio</span></div></div></div>
              <div className="h-[500px] w-full">{metrics.groups.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis type="number" dataKey="ventas" name="Ventas" stroke="#64748b" tickFormatter={(value) => formatCurrency(Number(value))} label={{ value: "Volumen de Ventas (PEN)", position: "bottom", offset: 20, fill: "#64748b", fontSize: 12 }} /><YAxis type="number" dataKey="margenPct" name="Margen %" stroke="#64748b" tickFormatter={(value) => `${value}%`} label={{ value: "Rentabilidad (%)", angle: -90, position: "left", fill: "#64748b", fontSize: 12 }} /><ZAxis type="number" dataKey="margen" range={[100, 1000]} /><Tooltip content={<CustomTooltip />} /><ReferenceLine y={metrics.avgMarginPct} stroke="#facc15" strokeDasharray="5 5" label={{ value: "M.B. Promedio", position: "insideBottomRight", fill: "#facc15", fontSize: 10 }} /><Scatter name="Grupos" data={metrics.groups}>{metrics.groups.map((entry) => <Cell key={entry.name} fill={entry.margenPct >= metrics.avgMarginPct ? "#10b981" : "#f43f5e"} fillOpacity={0.6} stroke={entry.margenPct >= metrics.avgMarginPct ? "#10b981" : "#f43f5e"} strokeWidth={2} />)}</Scatter></ScatterChart></ResponsiveContainer> : <EmptyState>No hay datos suficientes para la matriz.</EmptyState>}</div>
            </Card>
          ) : null}

          {activeTab === "table" ? (
            <Card className="overflow-hidden">
              <div className="border-b border-slate-700 bg-slate-800/50 p-6"><h3 className="text-xl font-bold text-white">Analisis Detallado por Grupo</h3><p className="text-sm text-slate-500">Listado de rendimiento filtrado por criterios actuales.</p></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-xs font-bold uppercase tracking-widest text-slate-500"><tr><th className="px-8 py-5">Grupo</th><th className="px-8 py-5 text-right">Ventas</th><th className="px-8 py-5 text-right">Margen Bruto</th><th className="px-8 py-5 text-right">Margen %</th><th className="px-8 py-5 text-right">Status</th></tr></thead>
                  <tbody className="divide-y divide-slate-800">
                    {metrics.groups.length ? metrics.groups.map((group) => {
                      const isHighPerf = group.margenPct >= metrics.avgMarginPct;
                      const isCritical = group.margenPct < 15;
                      return <tr key={group.name} className="transition-colors hover:bg-white/5"><td className="px-8 py-5 font-bold text-white">{group.name}</td><td className="px-8 py-5 text-right tabular-nums">{formatFullCurrency(group.ventas)}</td><td className="px-8 py-5 text-right tabular-nums text-slate-400">{formatFullCurrency(group.margen)}</td><td className={`px-8 py-5 text-right tabular-nums font-bold ${isHighPerf ? "text-emerald-400" : "text-rose-400"}`}>{formatPercent(group.margenPct)}</td><td className="px-8 py-5 text-right"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${isCritical ? "bg-rose-500/10 text-rose-500" : isHighPerf ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-500"}`}>{isCritical ? "Critico" : isHighPerf ? "Eficiente" : "Regular"}</span></td></tr>;
                    }) : <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-500">No hay datos para mostrar.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </main>

        <footer className="mt-12 text-center text-xs text-slate-600"><p>Datos procesados desde fuentes contables certificadas.</p></footer>
      </div>
    </div>
  );
}
