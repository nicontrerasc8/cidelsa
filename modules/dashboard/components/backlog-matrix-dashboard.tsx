"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  CalendarDays,
  Layers3,
  PackageOpen,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Label } from "@/components/ui/label";
import type { BacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";
import { buildBacklogMatrix } from "@/modules/dashboard/lib/backlog-matrix";

const ALL_VALUE = "__all__";
const YEAR_ALL_VALUE = "__all_years__";
const MONTH_ALL_VALUE = "__all_months__";
const MONTH_WITHOUT_VALUE = "__without_month__";
const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"] as const;
const MONTH_SHORT_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"] as const;
const CHART_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#84cc16", "#ec4899"] as const;
const CHART_TICK_STYLE = { fill: "rgba(226,232,240,0.68)", fontSize: 11 } as const;
const CHART_AXIS_STYLE = { stroke: "rgba(148,163,184,0.18)" } as const;

type DashboardRow = BacklogMatrixSummary["rows"][number];
type FilterOption = { label: string; value: string };
type TooltipPayload = { name?: string | number; value?: unknown; color?: string; fill?: string; dataKey?: string | number };

function formatPen(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(value || 0);
}

function formatCompactPen(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function matchesMonthFilter(monthIndex: number | null, selectedMonth: string) {
  if (selectedMonth === MONTH_ALL_VALUE) return true;
  if (selectedMonth === MONTH_WITHOUT_VALUE) return monthIndex === null;
  return monthIndex === Number(selectedMonth);
}

function getMonthLabel(selectedMonth: string) {
  if (selectedMonth === MONTH_ALL_VALUE) return "Todos los meses";
  if (selectedMonth === MONTH_WITHOUT_VALUE) return "Sin mes";
  return MONTH_LABELS[Number(selectedMonth)] ?? selectedMonth;
}

function sortEntries(map: Map<string, number>) {
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function groupRows(rows: DashboardRow[]) {
  const byLinea = new Map<string, number>();
  const byCliente = new Map<string, number>();
  const byEjecutivo = new Map<string, number>();
  const bySituacion = new Map<string, number>();

  for (const row of rows) {
    const linea = row.linea ?? "Sin linea";
    const cliente = row.cliente ?? "Sin cliente";
    const ejecutivo = row.ejecutivo ?? "Sin ejecutivo";
    const situacion = row.situacion ?? "Sin situacion";
    byLinea.set(linea, (byLinea.get(linea) ?? 0) + row.ventasMonto);
    byCliente.set(cliente, (byCliente.get(cliente) ?? 0) + row.ventasMonto);
    byEjecutivo.set(ejecutivo, (byEjecutivo.get(ejecutivo) ?? 0) + row.ventasMonto);
    bySituacion.set(situacion, (bySituacion.get(situacion) ?? 0) + row.ventasMonto);
  }

  return {
    lineas: sortEntries(byLinea),
    clientes: sortEntries(byCliente),
    ejecutivos: sortEntries(byEjecutivo),
    situaciones: sortEntries(bySituacion),
  };
}

function ShellCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-slate-900/55 shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}>{children}</div>;
}

function ShellCardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 pb-3 ${className}`}>{children}</div>;
}

function ShellCardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h3 className={`font-semibold text-slate-100 ${className}`}>{children}</h3>;
}

function ShellCardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>;
}
function FilterSelect({ label, value, onChange, options, disabled = false, icon }: { label: string; value: string; onChange: (value: string) => void; options: FilterOption[]; disabled?: boolean; icon?: ReactNode }) {
  return (
    <div className="min-w-[142px] flex-1">
      <Label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {icon}{label}
      </Label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 pr-8 text-sm text-slate-100 outline-none transition hover:border-slate-500 focus:ring-2 focus:ring-sky-500/45 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {options.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
        </select>
        <svg aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
  );
}

function KpiTile({ title, value, subtitle, icon: Icon, trend, chartData, color }: { title: string; value: string | number; subtitle?: string; icon: LucideIcon; trend?: number; chartData?: number[]; color: "sky" | "indigo" | "emerald" | "amber" }) {
  const colorClass = { sky: "from-sky-500/20 text-sky-400", indigo: "from-indigo-500/20 text-indigo-400", emerald: "from-emerald-500/20 text-emerald-400", amber: "from-amber-500/20 text-amber-400" }[color];
  const lineColor = { sky: "#0ea5e9", indigo: "#8b5cf6", emerald: "#10b981", amber: "#f59e0b" }[color];
  const sparklineData = chartData?.map((item, index) => ({ index, value: item })) ?? [];

  return (
    <div className="group relative flex min-h-[156px] flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-slate-900/65 p-5 shadow-2xl shadow-black/20 backdrop-blur-md transition hover:bg-slate-800/80">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorClass} to-transparent opacity-55`} />
      <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
        <div className="rounded-xl border border-white/5 bg-black/30 p-2.5 shadow-inner transition group-hover:scale-105"><Icon className="h-5 w-5" /></div>
        {trend !== undefined ? (
          <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{formatPercent(Math.abs(trend))}
          </div>
        ) : null}
      </div>
      <div className="relative z-10">
        <h4 className="mb-1 text-sm font-medium text-slate-400">{title}</h4>
        <div className="flex items-end justify-between gap-4">
          <div><div className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</div>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}</div>
          {sparklineData.length > 0 ? (
            <div className="h-10 w-20 opacity-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={sparklineData}><Line type="monotone" dataKey="value" stroke={lineColor} strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChartEmpty({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/30 text-sm text-slate-500">{label}</div>;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string | number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md">
      {label !== undefined ? <p className="mb-2 font-medium text-slate-300">{label}</p> : null}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const numericValue = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
          return <div key={`${entry.name ?? entry.dataKey ?? index}`} className="flex items-center gap-3 text-sm"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? entry.fill ?? CHART_COLORS[index % CHART_COLORS.length] }} /><span className="text-slate-400">{entry.name ?? entry.dataKey}:</span><span className="font-bold text-white">{formatPen(numericValue)}</span></div>;
        })}
      </div>
    </div>
  );
}

export function BacklogMatrixDashboard({
  summary,
  title = "Backlog por linea y mes",
  eyebrow = "Dashboard backlog",
  description = "",
  totalLabel = "Backlog total",
  totalVisibleLabel = "Total backlog visible:",
  showEtapaFilter = true,
  defaultEtapaValue = ALL_VALUE,
}: {
  summary: BacklogMatrixSummary;
  title?: string;
  eyebrow?: string;
  description?: string;
  cardTitle?: string;
  totalLabel?: string;
  emptyLabel?: string;
  totalVisibleLabel?: string;
  showSituacionBreakdown?: boolean;
  showEtapaFilter?: boolean;
  defaultEtapaValue?: string;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(String(summary.years[0] ?? YEAR_ALL_VALUE));
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedEtapa, setSelectedEtapa] = useState<string>(defaultEtapaValue);
  const [selectedSituacion, setSelectedSituacion] = useState<string>(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_ALL_VALUE);
  const showSituacionFilter = summary.situaciones.length > 1;
  const hasEtapaFilter = showEtapaFilter && summary.etapas.length > 0;
  const visibleYear = selectedYear === YEAR_ALL_VALUE ? null : Number(selectedYear);
  const previousYear = visibleYear === null ? null : visibleYear - 1;

  const matchesCommonFilters = useCallback((row: DashboardRow, includeYear: boolean) => {
    if (includeYear && visibleYear !== null && row.importYear !== visibleYear) return false;
    if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
    if (hasEtapaFilter && selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) return false;
    if (showSituacionFilter && selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) return false;
    if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
    if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
    if (!matchesMonthFilter(row.monthIndex, selectedMonth)) return false;
    return true;
  }, [
    hasEtapaFilter,
    selectedEjecutivo,
    selectedEtapa,
    selectedLinea,
    selectedMonth,
    selectedNegocio,
    selectedSituacion,
    showSituacionFilter,
    visibleYear,
  ]);

  const filteredRows = useMemo(() => summary.rows.filter((row) => matchesCommonFilters(row, true)), [matchesCommonFilters, summary.rows]);
  const previousRows = useMemo(() => {
    if (previousYear === null) return [];
    return summary.rows.filter((row) => row.importYear === previousYear && matchesCommonFilters(row, false));
  }, [matchesCommonFilters, previousYear, summary.rows]);
  const filteredSummary = useMemo(() => ({ ...summary, rows: filteredRows }), [filteredRows, summary]);
  const matrix = useMemo(() => buildBacklogMatrix(filteredSummary, null), [filteredSummary]);

  const yearOptions = useMemo(() => [{ label: "Todos los años", value: YEAR_ALL_VALUE }, ...summary.years.map((year) => ({ label: String(year), value: String(year) }))], [summary.years]);
  const negocioOptions = useMemo(() => [{ label: "Todos los negocios", value: ALL_VALUE }, ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio }))], [summary.negocios]);
  const etapaOptions = useMemo(() => [{ label: "Todas las etapas", value: ALL_VALUE }, ...summary.etapas.map((etapa) => ({ label: etapa, value: etapa }))], [summary.etapas]);
  const situacionOptions = useMemo(() => [{ label: "Todas las situaciones", value: ALL_VALUE }, ...summary.situaciones.map((situacion) => ({ label: situacion, value: situacion }))], [summary.situaciones]);

  const availableLineas = useMemo(() => {
    const lineas = new Set<string>();
    for (const row of summary.rows) {
      if (visibleYear !== null && row.importYear !== visibleYear) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (hasEtapaFilter && selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) continue;
      if (showSituacionFilter && selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) continue;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) continue;
      if (!matchesMonthFilter(row.monthIndex, selectedMonth)) continue;
      if (row.linea) lineas.add(row.linea);
    }
    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [hasEtapaFilter, selectedEjecutivo, selectedEtapa, selectedMonth, selectedNegocio, selectedSituacion, showSituacionFilter, summary.rows, visibleYear]);

  const availableEjecutivos = useMemo(() => {
    const ejecutivos = new Set<string>();
    for (const row of summary.rows) {
      if (visibleYear !== null && row.importYear !== visibleYear) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (hasEtapaFilter && selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) continue;
      if (showSituacionFilter && selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;
      if (!matchesMonthFilter(row.monthIndex, selectedMonth)) continue;
      if (row.ejecutivo) ejecutivos.add(row.ejecutivo);
    }
    return [...ejecutivos].sort((a, b) => a.localeCompare(b));
  }, [hasEtapaFilter, selectedEtapa, selectedLinea, selectedMonth, selectedNegocio, selectedSituacion, showSituacionFilter, summary.rows, visibleYear]);

  const availableMonthIndexes = useMemo(() => {
    const indexes = new Set<number>();
    let hasRowsWithoutMonth = false;
    for (const row of summary.rows) {
      if (visibleYear !== null && row.importYear !== visibleYear) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (hasEtapaFilter && selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) continue;
      if (showSituacionFilter && selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) continue;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;
      if (row.monthIndex === null) hasRowsWithoutMonth = true;
      else indexes.add(row.monthIndex);
    }
    return { indexes: [...indexes].sort((a, b) => a - b), hasRowsWithoutMonth };
  }, [hasEtapaFilter, selectedEjecutivo, selectedEtapa, selectedLinea, selectedNegocio, selectedSituacion, showSituacionFilter, summary.rows, visibleYear]);

  const lineaOptions = useMemo(() => [{ label: "Todas las lineas", value: ALL_VALUE }, ...availableLineas.map((linea) => ({ label: linea, value: linea }))], [availableLineas]);
  const ejecutivoOptions = useMemo(() => [{ label: "Todos los ejecutivos", value: ALL_VALUE }, ...availableEjecutivos.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo }))], [availableEjecutivos]);
  const monthOptions = useMemo(() => [{ label: "Todos los meses", value: MONTH_ALL_VALUE }, ...availableMonthIndexes.indexes.map((index) => ({ label: MONTH_LABELS[index] ?? `Mes ${index + 1}`, value: String(index) })), ...(availableMonthIndexes.hasRowsWithoutMonth ? [{ label: "Sin mes", value: MONTH_WITHOUT_VALUE }] : [])], [availableMonthIndexes]);
  const analytics = useMemo(() => {
    const totalCurrent = filteredRows.reduce((sum, row) => sum + row.ventasMonto, 0);
    const totalPrevious = previousRows.reduce((sum, row) => sum + row.ventasMonto, 0);
    const growth = totalPrevious === 0 ? (totalCurrent > 0 ? 100 : 0) : ((totalCurrent - totalPrevious) / Math.abs(totalPrevious)) * 100;
    const grouped = groupRows(filteredRows);
    const currentMonthTotals = new Array<number>(12).fill(0);
    const previousMonthTotals = new Array<number>(12).fill(0);

    for (const row of filteredRows) if (row.monthIndex !== null) currentMonthTotals[row.monthIndex] += row.ventasMonto;
    for (const row of previousRows) if (row.monthIndex !== null) previousMonthTotals[row.monthIndex] += row.ventasMonto;

    const clientesTopBase = grouped.clientes.slice(0, 6);
    const otrosClientes = grouped.clientes.slice(6).reduce((sum, entry) => sum + entry.value, 0);

    return {
      totalCurrent,
      totalPrevious,
      growth,
      lineasTop: grouped.lineas.slice(0, 7),
      clientesTop: otrosClientes > 0 ? [...clientesTopBase, { name: "Otros", value: otrosClientes }] : clientesTopBase,
      ejecutivosTop: grouped.ejecutivos.slice(0, 7),
      situaciones: grouped.situaciones,
      monthsComparison: MONTH_SHORT_LABELS.map((month, index) => ({ month, actual: currentMonthTotals[index], anterior: previousMonthTotals[index] })),
      currentMonthTotals,
      activeMonthCount: currentMonthTotals.filter((value) => value !== 0).length,
    };
  }, [filteredRows, previousRows]);

  const activeNegocioLabel = selectedNegocio === ALL_VALUE ? "Todos los negocios" : negocioOptions.find((option) => option.value === selectedNegocio)?.label ?? selectedNegocio;

  function resetDependentFilters() {
    setSelectedLinea(ALL_VALUE);
    setSelectedEjecutivo(ALL_VALUE);
    setSelectedMonth(MONTH_ALL_VALUE);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b14] p-4 text-slate-200 sm:p-6 lg:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-12%] top-[-16%] h-[42rem] w-[42rem] rounded-full bg-sky-900/20 blur-[120px]" />
        <div className="absolute bottom-[-16%] right-[-10%] h-[34rem] w-[34rem] rounded-full bg-indigo-900/20 blur-[110px]" />
        <div className="absolute left-[35%] top-[8%] h-56 w-56 rounded-full bg-emerald-700/10 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] space-y-8">
        <header className="overflow-hidden rounded-3xl border border-white/5 bg-slate-900/45 p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-3 text-sky-400"><Activity className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.24em]">{eyebrow}</span></div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title} <span className="text-sky-400">{selectedYear === YEAR_ALL_VALUE ? "global" : selectedYear}</span></h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{description || "Analisis dinamico por linea, cliente, ejecutivo y mes usando los montos normalizados del payload importado."}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{activeNegocioLabel}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{getMonthLabel(selectedMonth)}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{filteredRows.length} registros</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{matrix.lines.length} lineas visibles</span></div>
            </div>

            <div className="w-full rounded-3xl border border-white/10 bg-black/20 p-4 shadow-inner xl:max-w-4xl">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Filtros</p><p className="mt-1 text-lg font-semibold text-white">Cruza la data como necesites</p></div><div className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-slate-300">{totalVisibleLabel} {formatCompactPen(matrix.grandTotal)}</div></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FilterSelect label="Año" value={selectedYear} onChange={(value) => { setSelectedYear(value); resetDependentFilters(); }} options={yearOptions} icon={<CalendarDays className="h-3 w-3" />} />
                <FilterSelect label="Mes" value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
                <FilterSelect label="Negocio" value={selectedNegocio} onChange={(value) => { setSelectedNegocio(value); resetDependentFilters(); }} options={negocioOptions} />
                {hasEtapaFilter ? <FilterSelect label="Etapa" value={selectedEtapa} onChange={(value) => { setSelectedEtapa(value); resetDependentFilters(); }} options={etapaOptions} /> : null}
                {showSituacionFilter ? <FilterSelect label="Situacion" value={selectedSituacion} onChange={(value) => { setSelectedSituacion(value); resetDependentFilters(); }} options={situacionOptions} /> : null}
                <FilterSelect label="Ejecutivo" value={selectedEjecutivo} onChange={(value) => { setSelectedEjecutivo(value); setSelectedLinea(ALL_VALUE); }} options={ejecutivoOptions} />
                <FilterSelect label="Linea" value={selectedLinea} onChange={(value) => { setSelectedLinea(value); setSelectedEjecutivo(ALL_VALUE); }} options={lineaOptions} />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile title={totalLabel} value={formatPen(analytics.totalCurrent)} subtitle={previousYear === null ? "Acumulado de todos los años" : `vs ${formatPen(analytics.totalPrevious)} en ${previousYear}`} icon={Layers3} trend={previousYear === null ? undefined : analytics.growth} chartData={analytics.currentMonthTotals} color="sky" />
          <KpiTile title="Lineas activas" value={matrix.lines.length} subtitle="Con monto visible en la matriz" icon={PackageOpen} color="indigo" />
          <KpiTile title="Top ejecutivo" value={formatCompactPen(analytics.ejecutivosTop[0]?.value ?? 0)} subtitle={analytics.ejecutivosTop[0]?.name ?? "Sin ejecutivo"} icon={UsersRound} color="emerald" />
          <KpiTile title="Meses con actividad" value={`${analytics.activeMonthCount}/12`} subtitle={`${filteredRows.length} registros visibles`} icon={Zap} color="amber" />
        </section>

        <ShellCard>
          <ShellCardHeader>
            <ShellCardTitle>Comparacion anual</ShellCardTitle>
            <p className="mt-1 text-xs text-slate-400">
              {visibleYear === null ? "Vista acumulada mensual" : `${visibleYear} vs ${previousYear}`}
            </p>
          </ShellCardHeader>
          <ShellCardContent className="h-[480px]">
            {analytics.monthsComparison.some((month) => month.actual !== 0 || month.anterior !== 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.monthsComparison} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="backlog-current" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="backlog-previous" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={CHART_TICK_STYLE} axisLine={CHART_AXIS_STYLE} tickLine={CHART_AXIS_STYLE} />
                  <YAxis tickFormatter={(value) => formatCompactPen(Number(value))} tick={CHART_TICK_STYLE} axisLine={CHART_AXIS_STYLE} tickLine={CHART_AXIS_STYLE} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" name={previousYear === null ? "Anterior" : String(previousYear)} dataKey="anterior" stroke="#64748b" strokeDasharray="5 5" fill="url(#backlog-previous)" />
                  <Area type="monotone" name={visibleYear === null ? "Actual" : String(visibleYear)} dataKey="actual" stroke="#0ea5e9" strokeWidth={3} fill="url(#backlog-current)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <ChartEmpty label="No hay datos mensuales para graficar." />}
          </ShellCardContent>
        </ShellCard>
      </div>
    </div>
  );
}

