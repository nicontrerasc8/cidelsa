
"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ListFilter,
  PieChart as PieChartIcon,
  Rows3,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Label } from "@/components/ui/label";

const ALL_VALUE = "__all__";
const YEAR_ALL_VALUE = "__all_years__";
const MONTH_ALL_VALUE = "__all_months__";
const MONTH_WITHOUT_VALUE = "__without_month__";
const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"] as const;
const MONTH_SHORT_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"] as const;
const CHART_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#84cc16", "#ec4899", "#f97316", "#64748b"] as const;
const CHART_TICK_STYLE = { fill: "rgba(226,232,240,0.68)", fontSize: 11 } as const;
const CHART_AXIS_STYLE = { stroke: "rgba(148,163,184,0.18)" } as const;

type DashboardRow = {
  importYear: number | null;
  negocio: string | null;
  linea: string | null;
  cliente: string | null;
  etapa?: string | null;
  situacion: string | null;
  ejecutivo: string | null;
  monthIndex: number | null;
  ventasMonto: number;
};

type DashboardSummary = {
  years: number[];
  negocios: string[];
  situaciones: string[];
  etapas?: string[];
  ejecutivos: string[];
  lineas: string[];
  rows: DashboardRow[];
};

type RankingScope = "lineas" | "clientes" | "ejecutivos";
type FilterOption = { label: string; value: string };
type ChartEntry = { name: string; value: number };
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
function FilterSelect({ label, value, options, onChange, disabled = false, icon }: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void; disabled?: boolean; icon?: ReactNode }) {
  return (
    <div className="min-w-[150px] flex-1">
      <Label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{icon}{label}</Label>
      <div className="relative">
        <select
          className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 pr-8 text-sm text-slate-100 outline-none transition hover:border-slate-500 focus:ring-2 focus:ring-sky-500/45 disabled:cursor-not-allowed disabled:opacity-45"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          {options.map((option) => <option key={option.value} value={option.value} className="bg-slate-950">{option.label}</option>)}
        </select>
        <svg aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
  );
}

function KpiTile({ title, value, subtitle, icon: Icon, color }: { title: string; value: string | number; subtitle?: string; icon: LucideIcon; color: "sky" | "indigo" | "emerald" | "amber" }) {
  const colorClass = { sky: "from-sky-500/20 text-sky-400", indigo: "from-indigo-500/20 text-indigo-400", emerald: "from-emerald-500/20 text-emerald-400", amber: "from-amber-500/20 text-amber-400" }[color];
  return (
    <div className="group relative min-h-[140px] overflow-hidden rounded-2xl border border-white/5 bg-slate-900/65 p-5 shadow-2xl shadow-black/20 backdrop-blur-md transition hover:bg-slate-800/80">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colorClass} to-transparent opacity-55`} />
      <div className="relative z-10 flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-3"><div className="rounded-xl border border-white/5 bg-black/30 p-2.5 shadow-inner"><Icon className="h-5 w-5" /></div></div>
        <div><p className="mb-1 text-sm font-medium text-slate-400">{title}</p><div className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</div>{subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}</div>
      </div>
    </div>
  );
}

function ScopePill({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return <Link href={href} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${active ? "border-sky-400/50 bg-sky-500 text-white shadow-[0_0_24px_rgba(14,165,233,0.25)]" : "border-white/8 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100"}`}>{children}</Link>;
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

function RankingMiniList({ items, total }: { items: ChartEntry[]; total: number }) {
  return <div className="space-y-2">{items.map((item, index) => <div key={item.name} className="rounded-xl border border-white/5 bg-white/[0.03] p-3"><div className="mb-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="truncate text-sm font-medium text-slate-200">{item.name}</span></div><span className="text-sm font-bold text-white">{formatCompactPen(item.value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${total > 0 ? Math.min((item.value / total) * 100, 100) : 0}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /></div></div>)}</div>;
}
export function BacklogRankingDetailView({ summary, scope, basePath, eyebrow, title, filters }: { summary: DashboardSummary; scope: RankingScope; basePath: string; eyebrow: string; title: string; filters: { anio?: string; negocio?: string; etapa?: string; situacion?: string; ejecutivo?: string; linea?: string; mes?: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedYear = filters.anio ?? YEAR_ALL_VALUE;
  const selectedNegocio = filters.negocio ?? ALL_VALUE;
  const selectedEtapa = filters.etapa ?? ALL_VALUE;
  const selectedSituacion = filters.situacion ?? ALL_VALUE;
  const selectedEjecutivo = filters.ejecutivo ?? ALL_VALUE;
  const selectedLinea = filters.linea ?? ALL_VALUE;
  const selectedMonth = filters.mes ?? MONTH_ALL_VALUE;
  const showExecutiveFilter = summary.ejecutivos.length > 0;
  const showSituacionFilter = summary.situaciones.length > 1;
  const etapaOptionsSource = summary.etapas ?? [];
  const showEtapaFilter = etapaOptionsSource.length > 0;

  const availableLineas = useMemo(() => {
    const lineas = new Set<string>();
    for (const row of summary.rows) {
      if (selectedYear !== YEAR_ALL_VALUE && row.importYear !== Number(selectedYear)) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) continue;
      if (selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) continue;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) continue;
      if (!matchesMonthFilter(row.monthIndex, selectedMonth)) continue;
      if (row.linea) lineas.add(row.linea);
    }
    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedEjecutivo, selectedEtapa, selectedMonth, selectedNegocio, selectedSituacion, selectedYear, summary.rows]);

  const availableEjecutivos = useMemo(() => {
    const ejecutivos = new Set<string>();
    for (const row of summary.rows) {
      if (selectedYear !== YEAR_ALL_VALUE && row.importYear !== Number(selectedYear)) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) continue;
      if (selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;
      if (!matchesMonthFilter(row.monthIndex, selectedMonth)) continue;
      if (row.ejecutivo) ejecutivos.add(row.ejecutivo);
    }
    return [...ejecutivos].sort((a, b) => a.localeCompare(b));
  }, [selectedEtapa, selectedLinea, selectedMonth, selectedNegocio, selectedSituacion, selectedYear, summary.rows]);

  const availableMonthIndexes = useMemo(() => {
    const indexes = new Set<number>();
    let hasRowsWithoutMonth = false;
    for (const row of summary.rows) {
      if (selectedYear !== YEAR_ALL_VALUE && row.importYear !== Number(selectedYear)) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) continue;
      if (selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) continue;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;
      if (row.monthIndex === null) hasRowsWithoutMonth = true;
      else indexes.add(row.monthIndex);
    }
    return { indexes: [...indexes].sort((a, b) => a - b), hasRowsWithoutMonth };
  }, [selectedEjecutivo, selectedEtapa, selectedLinea, selectedNegocio, selectedSituacion, selectedYear, summary.rows]);

  const filteredRows = useMemo(() => summary.rows.filter((row) => {
    if (selectedYear !== YEAR_ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
    if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
    if (selectedEtapa !== ALL_VALUE && row.etapa !== selectedEtapa) return false;
    if (selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) return false;
    if (showExecutiveFilter && selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
    if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
    if (!matchesMonthFilter(row.monthIndex, selectedMonth)) return false;
    return true;
  }), [selectedEjecutivo, selectedEtapa, selectedLinea, selectedMonth, selectedNegocio, selectedSituacion, selectedYear, showExecutiveFilter, summary.rows]);

  const analytics = useMemo(() => {
    const byLinea = new Map<string, number>();
    const byCliente = new Map<string, number>();
    const byEjecutivo = new Map<string, number>();
    const byMonth = new Array<number>(13).fill(0);

    for (const row of filteredRows) {
      const linea = row.linea ?? "Sin linea";
      const cliente = row.cliente ?? "Sin cliente";
      const ejecutivo = row.ejecutivo ?? "Sin ejecutivo";
      byLinea.set(linea, (byLinea.get(linea) ?? 0) + row.ventasMonto);
      byCliente.set(cliente, (byCliente.get(cliente) ?? 0) + row.ventasMonto);
      byEjecutivo.set(ejecutivo, (byEjecutivo.get(ejecutivo) ?? 0) + row.ventasMonto);
      byMonth[row.monthIndex ?? MONTH_LABELS.length] += row.ventasMonto;
    }

    return {
      lineas: sortEntries(byLinea),
      clientes: sortEntries(byCliente),
      ejecutivos: sortEntries(byEjecutivo),
      months: [...MONTH_SHORT_LABELS, "Sin mes"].map((month, index) => ({ name: month, value: byMonth[index] })),
    };
  }, [filteredRows]);

  const config = scope === "lineas" ? { data: analytics.lineas, singular: "Linea", plural: "Lineas", color: "#0ea5e9" } : scope === "clientes" ? { data: analytics.clientes, singular: "Cliente", plural: "Clientes", color: "#f59e0b" } : { data: analytics.ejecutivos, singular: "Ejecutivo", plural: "Ejecutivos", color: "#10b981" };
  const totalMonto = config.data.reduce((sum, item) => sum + item.value, 0);
  const topItem = config.data[0];
  const topShare = totalMonto > 0 && topItem ? (topItem.value / totalMonto) * 100 : 0;

  function buildParams(overrides?: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides ?? {})) {
      if (!value || value === ALL_VALUE || value === YEAR_ALL_VALUE || value === MONTH_ALL_VALUE) params.delete(key);
      else params.set(key, value);
    }
    return params;
  }

  function pushFilters(overrides: Record<string, string>) {
    const params = buildParams(overrides);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function buildScopeHref(nextScope: RankingScope) {
    const params = buildParams({ scope: nextScope });
    return `${basePath}/detalle?${params.toString()}`;
  }

  function buildBackHref() {
    const params = buildParams();
    params.delete("scope");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050b14] p-4 text-slate-200 sm:p-6 lg:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute left-[-12%] top-[-16%] h-[42rem] w-[42rem] rounded-full bg-sky-900/20 blur-[120px]" /><div className="absolute bottom-[-16%] right-[-10%] h-[34rem] w-[34rem] rounded-full bg-indigo-900/20 blur-[110px]" /><div className="absolute left-[35%] top-[8%] h-56 w-56 rounded-full bg-emerald-700/10 blur-[80px]" /></div>
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-8">
        <header className="overflow-hidden rounded-3xl border border-white/5 bg-slate-900/45 p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <Link href={buildBackHref()} className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10"><ArrowLeft className="h-4 w-4" />Volver al dashboard</Link>
              <div className="mb-3 flex items-center gap-3 text-sky-400"><BarChart3 className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.24em]">{eyebrow}</span></div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">Ranking detallado por {config.plural.toLowerCase()}, con filtros sincronizados por URL y montos calculados desde la data visible.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{selectedYear === YEAR_ALL_VALUE ? "Todos los años" : selectedYear}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{getMonthLabel(selectedMonth)}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{filteredRows.length} registros</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">{config.data.length} {config.plural.toLowerCase()}</span></div>
            </div>
            <div className="w-full rounded-3xl border border-white/10 bg-black/20 p-4 shadow-inner xl:max-w-4xl">
              <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.24em] text-slate-500">Filtros</p><p className="mt-1 text-lg font-semibold text-white">Ajusta el detalle</p></div><div className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-xs font-semibold text-slate-300">Total {formatCompactPen(totalMonto)}</div></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <FilterSelect label="Año" value={selectedYear} onChange={(value) => pushFilters({ anio: value })} options={[{ label: "Todos los años", value: YEAR_ALL_VALUE }, ...summary.years.map((year) => ({ label: String(year), value: String(year) }))]} icon={<CalendarDays className="h-3 w-3" />} />
                <FilterSelect label="Mes" value={selectedMonth} onChange={(value) => pushFilters({ mes: value })} options={[{ label: "Todos los meses", value: MONTH_ALL_VALUE }, ...availableMonthIndexes.indexes.map((index) => ({ label: MONTH_LABELS[index] ?? `Mes ${index + 1}`, value: String(index) })), ...(availableMonthIndexes.hasRowsWithoutMonth ? [{ label: "Sin mes", value: MONTH_WITHOUT_VALUE }] : [])]} />
                <FilterSelect label="Negocio" value={selectedNegocio} onChange={(value) => pushFilters({ negocio: value, linea: ALL_VALUE })} options={[{ label: "Todos los negocios", value: ALL_VALUE }, ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio }))]} />
                {showEtapaFilter ? <FilterSelect label="Etapa" value={selectedEtapa} onChange={(value) => pushFilters({ etapa: value })} options={[{ label: "Todas las etapas", value: ALL_VALUE }, ...etapaOptionsSource.map((etapa) => ({ label: etapa, value: etapa }))]} /> : null}
                {showSituacionFilter ? <FilterSelect label="Situacion" value={selectedSituacion} onChange={(value) => pushFilters({ situacion: value })} options={[{ label: "Todas las situaciones", value: ALL_VALUE }, ...summary.situaciones.map((situacion) => ({ label: situacion, value: situacion }))]} /> : null}
                {showExecutiveFilter ? <FilterSelect label="Ejecutivo" value={selectedEjecutivo} onChange={(value) => pushFilters({ ejecutivo: value, linea: ALL_VALUE })} options={[{ label: "Todos los ejecutivos", value: ALL_VALUE }, ...availableEjecutivos.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo }))]} /> : null}
                <FilterSelect label="Linea" value={selectedLinea} onChange={(value) => pushFilters({ linea: value, ejecutivo: ALL_VALUE })} options={[{ label: "Todas las lineas", value: ALL_VALUE }, ...availableLineas.map((linea) => ({ label: linea, value: linea }))]} />
              </div>
            </div>
          </div>
        </header>

        <nav className="inline-flex flex-wrap gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-1.5 backdrop-blur-md"><ScopePill href={buildScopeHref("lineas")} active={scope === "lineas"}>Lineas</ScopePill><ScopePill href={buildScopeHref("clientes")} active={scope === "clientes"}>Clientes</ScopePill><ScopePill href={buildScopeHref("ejecutivos")} active={scope === "ejecutivos"}>Ejecutivos</ScopePill></nav>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile title="Monto visible" value={formatPen(totalMonto)} subtitle="Suma del ranking actual" icon={TrendingUp} color="sky" />
          <KpiTile title={`Total ${config.plural.toLowerCase()}`} value={config.data.length} subtitle="Elementos con monto visible" icon={Rows3} color="indigo" />
          <KpiTile title="Principal" value={formatCompactPen(topItem?.value ?? 0)} subtitle={topItem?.name ?? "Sin datos"} icon={UsersRound} color="emerald" />
          <KpiTile title="Concentracion top" value={formatPercent(topShare)} subtitle="Peso del primer item" icon={ListFilter} color="amber" />
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <ShellCard>
            <ShellCardHeader className="flex items-center justify-between gap-3"><div><ShellCardTitle>Participacion del top 10</ShellCardTitle><p className="mt-1 text-xs text-slate-400">Distribucion de monto por {config.plural.toLowerCase()}</p></div><PieChartIcon className="h-5 w-5 text-sky-400" /></ShellCardHeader>
            <ShellCardContent className="min-h-[420px]">
              {config.data.length ? <div className="grid h-full gap-6 lg:grid-cols-[1.05fr_0.95fr]"><div className="h-[330px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={config.data.slice(0, 10)} dataKey="value" nameKey="name" outerRadius={130} innerRadius={72} paddingAngle={4} stroke="none">{config.data.slice(0, 10).map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></div><div className="max-h-[340px] overflow-y-auto pr-1"><RankingMiniList items={config.data.slice(0, 10)} total={totalMonto} /></div></div> : <ChartEmpty label="No hay participacion para mostrar." />}
            </ShellCardContent>
          </ShellCard>

          <ShellCard>
            <ShellCardHeader><ShellCardTitle>Ranking compacto</ShellCardTitle><p className="mt-1 text-xs text-slate-400">Top 8 por monto</p></ShellCardHeader>
            <ShellCardContent className="h-[420px]">
              {config.data.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={config.data.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 10, left: 14, bottom: 8 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={128} tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>{config.data.slice(0, 8).map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <ChartEmpty label="No hay ranking para graficar." />}
            </ShellCardContent>
          </ShellCard>
        </section>

        <ShellCard>
          <ShellCardHeader><ShellCardTitle>Comportamiento por mes</ShellCardTitle><p className="mt-1 text-xs text-slate-400">Monto visible distribuido por calendario</p></ShellCardHeader>
          <ShellCardContent className="h-[360px]">
            {analytics.months.some((entry) => entry.value !== 0) ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.months} margin={{ top: 20, right: 20, left: -8, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={72} tick={CHART_TICK_STYLE} axisLine={CHART_AXIS_STYLE} tickLine={CHART_AXIS_STYLE} /><YAxis tickFormatter={(value) => formatCompactPen(Number(value))} tick={CHART_TICK_STYLE} axisLine={CHART_AXIS_STYLE} tickLine={CHART_AXIS_STYLE} /><Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} /><Bar dataKey="value" fill={config.color} radius={[8, 8, 0, 0]} barSize={40} /></BarChart></ResponsiveContainer> : <ChartEmpty label="No hay meses con datos visibles." />}
          </ShellCardContent>
        </ShellCard>

        <ShellCard className="overflow-hidden">
          <ShellCardHeader className="border-b border-white/5 bg-slate-900/70"><ShellCardTitle>Tabla completa</ShellCardTitle><p className="mt-1 text-sm text-slate-400">Detalle ordenado por monto descendente.</p></ShellCardHeader>
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-800/80 text-xs uppercase text-slate-400"><tr><th className="sticky top-0 z-10 bg-slate-800 px-5 py-4 text-left font-semibold">#</th><th className="sticky top-0 z-10 bg-slate-800 px-5 py-4 text-left font-semibold">{config.singular}</th><th className="sticky top-0 z-10 bg-slate-800 px-5 py-4 text-right font-semibold">Monto</th><th className="sticky top-0 z-10 bg-slate-800 px-5 py-4 text-right font-semibold">% del total</th><th className="sticky top-0 z-10 bg-slate-800 px-5 py-4 text-right font-semibold">Barra</th></tr></thead>
              <tbody className="divide-y divide-white/5 bg-[#0c1624] text-slate-200">
                {config.data.length ? config.data.map((entry, index) => {
                  const percentage = totalMonto > 0 ? (entry.value / totalMonto) * 100 : 0;
                  return <tr key={entry.name} className="transition hover:bg-white/[0.035]"><td className="px-5 py-4 text-slate-500">{index + 1}</td><td className="px-5 py-4 font-medium text-white"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />{entry.name}</div></td><td className="px-5 py-4 text-right font-bold tabular-nums text-sky-300">{formatPen(entry.value)}</td><td className="px-5 py-4 text-right tabular-nums text-slate-300">{formatPercent(percentage)}</td><td className="px-5 py-4"><div className="ml-auto h-2 max-w-[180px] overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /></div></td></tr>;
                }) : <tr><td colSpan={5} className="px-5 py-14 text-center text-slate-500">No hay filas para mostrar.</td></tr>}
              </tbody>
            </table>
          </div>
        </ShellCard>
      </div>
    </div>
  );
}
