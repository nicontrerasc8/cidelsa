"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Gauge,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import type { CommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

const ALL_VALUE = "__all__";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;
const CHART_COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"] as const;

type PeriodMetric = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  total: number;
  devoluciones: number;
  topClientShare: number;
  topExecutiveShare: number;
  top2ClientShare: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(1)}%`;
}

function growthPct(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function riskTone(value: number, warning: number, danger: number) {
  if (value >= danger) return "danger";
  if (value >= warning) return "warning";
  return "success";
}

function momentumTone(value: number | null) {
  if (value === null) return "neutral";
  if (value <= -20) return "danger";
  if (value <= -8) return "warning";
  return "success";
}

function toneClasses(tone: "success" | "warning" | "danger" | "neutral") {
  if (tone === "danger") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  if (tone === "warning") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (tone === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  return "border-slate-700 bg-slate-900/70 text-slate-200";
}

function FilterSelect({
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
    <label className="flex min-w-[150px] flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof TrendingUp;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 p-3 text-sky-300">
          <Icon className="size-5" />
        </div>
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
      {label ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.value}`} className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              {entry.name}
            </div>
            <span className="text-sm font-semibold text-white">{formatCurrency(Number(entry.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BusinessHealthDashboard({
  summary,
  title = "Salud del negocio",
  subtitle = "El dashboard principal para leer riesgo, concentracion y momentum del negocio en segundos.",
}: {
  summary: CommercialHealthSummary;
  title?: string;
  subtitle?: string;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>(ALL_VALUE);

  const filteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedYear !== ALL_VALUE && row.activityYear !== Number(selectedYear)) return false;
        if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
        if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
        if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
        return true;
      }),
    [selectedEjecutivo, selectedLinea, selectedNegocio, selectedYear, summary.rows],
  );

  const periodMetrics = useMemo(() => {
    const grouped = new Map<
      string,
      {
        year: number;
        monthIndex: number;
        total: number;
        devoluciones: number;
        clients: Map<string, number>;
        executives: Map<string, number>;
      }
    >();

    for (const row of filteredRows) {
      if (row.activityYear === null || row.monthIndex === null) continue;
      const key = `${row.activityYear}-${String(row.monthIndex + 1).padStart(2, "0")}`;
      const current =
        grouped.get(key) ??
        {
          year: row.activityYear,
          monthIndex: row.monthIndex,
          total: 0,
          devoluciones: 0,
          clients: new Map<string, number>(),
          executives: new Map<string, number>(),
        };

      current.total += row.ventasMonto;
      if (row.ventasMonto < 0) current.devoluciones += Math.abs(row.ventasMonto);
      current.clients.set(row.cliente, (current.clients.get(row.cliente) ?? 0) + row.ventasMonto);
      if (row.ejecutivo) {
        current.executives.set(row.ejecutivo, (current.executives.get(row.ejecutivo) ?? 0) + row.ventasMonto);
      }
      grouped.set(key, current);
    }

    return [...grouped.entries()]
      .map<PeriodMetric>(([key, value]) => {
        const clientTotals = [...value.clients.values()].sort((a, b) => b - a);
        const executiveTotals = [...value.executives.values()].sort((a, b) => b - a);
        const topClientShare = value.total ? ((clientTotals[0] ?? 0) / value.total) * 100 : 0;
        const topExecutiveShare = value.total ? ((executiveTotals[0] ?? 0) / value.total) * 100 : 0;
        const top2ClientShare = value.total ? (((clientTotals[0] ?? 0) + (clientTotals[1] ?? 0)) / value.total) * 100 : 0;

        return {
          key,
          label: `${MONTHS[value.monthIndex]} ${value.year}`,
          year: value.year,
          monthIndex: value.monthIndex,
          total: value.total,
          devoluciones: value.devoluciones,
          topClientShare,
          topExecutiveShare,
          top2ClientShare,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });
  }, [filteredRows]);

  const analytics = useMemo(() => {
    const totalVentasNetas = filteredRows.reduce((sum, row) => sum + row.ventasMonto, 0);
    const devoluciones = filteredRows.reduce((sum, row) => sum + (row.ventasMonto < 0 ? Math.abs(row.ventasMonto) : 0), 0);
    const currentPeriod = periodMetrics.at(-1) ?? null;
    const previousPeriod = periodMetrics.length > 1 ? periodMetrics.at(-2) ?? null : null;
    const yoyPeriod =
      currentPeriod === null
        ? null
        : periodMetrics.find(
            (item) => item.year === currentPeriod.year - 1 && item.monthIndex === currentPeriod.monthIndex,
          ) ?? null;
    const momGrowth = currentPeriod && previousPeriod ? growthPct(currentPeriod.total, previousPeriod.total) : null;
    const yoyGrowth = currentPeriod && yoyPeriod ? growthPct(currentPeriod.total, yoyPeriod.total) : null;

    const currentRows = filteredRows.filter(
      (row) =>
        currentPeriod !== null &&
        row.activityYear === currentPeriod.year &&
        row.monthIndex === currentPeriod.monthIndex,
    );

    const clientTotals = new Map<string, number>();
    for (const row of currentRows) {
      clientTotals.set(row.cliente, (clientTotals.get(row.cliente) ?? 0) + row.ventasMonto);
    }
    const topClients = [...clientTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cliente, ventasMonto]) => ({ cliente, ventasMonto }));

    const top2Share = currentPeriod?.top2ClientShare ?? 0;
    const topExecutiveShare = currentPeriod?.topExecutiveShare ?? 0;
    const returnRate = totalVentasNetas !== 0 ? (devoluciones / Math.abs(totalVentasNetas)) * 100 : 0;

    const insights: string[] = [];
    if (top2Share >= 60) insights.push(`El ${top2Share.toFixed(1)}% de la venta del ultimo mes depende de 2 clientes.`);
    if (topExecutiveShare >= 40) insights.push(`La dependencia del ejecutivo lider subio a ${topExecutiveShare.toFixed(1)}%.`);
    if (momGrowth !== null && momGrowth <= -20) insights.push(`Caida fuerte de ${momGrowth.toFixed(1)}% vs el mes anterior.`);
    if (yoyGrowth !== null && yoyGrowth <= -15) insights.push(`Retroceso de ${yoyGrowth.toFixed(1)}% vs el mismo mes del anio pasado.`);
    if (returnRate >= 8) insights.push(`Las devoluciones ya equivalen al ${returnRate.toFixed(1)}% de la venta neta visible.`);
    if (!insights.length) insights.push("La foto actual no muestra alertas criticas de concentracion ni caidas abruptas.");

    return {
      totalVentasNetas,
      devoluciones,
      currentPeriod,
      previousPeriod,
      momGrowth,
      yoyGrowth,
      top2Share,
      topExecutiveShare,
      returnRate,
      topClients,
      insights,
    };
  }, [filteredRows, periodMetrics]);

  const yearOptions = useMemo(
    () => [{ label: "Todos los anios", value: ALL_VALUE }, ...summary.years.map((year) => ({ label: String(year), value: String(year) }))],
    [summary.years],
  );
  const negocioOptions = useMemo(
    () => [{ label: "Todos los negocios", value: ALL_VALUE }, ...summary.negocios.map((item) => ({ label: item, value: item }))],
    [summary.negocios],
  );
  const lineaOptions = useMemo(
    () => [{ label: "Todas las lineas", value: ALL_VALUE }, ...summary.lineas.map((item) => ({ label: item, value: item }))],
    [summary.lineas],
  );
  const ejecutivoOptions = useMemo(
    () => [{ label: "Todos los ejecutivos", value: ALL_VALUE }, ...summary.ejecutivos.map((item) => ({ label: item, value: item }))],
    [summary.ejecutivos],
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#15304f_0%,#08111d_35%,#030712_100%)] text-white">
      <div className="mx-auto max-w-[1550px] space-y-8 px-6 py-10">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Dashboard principal</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">{subtitle}</p>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/45 p-4 md:grid-cols-2 xl:grid-cols-4">
              <FilterSelect label="Anio" value={selectedYear} onChange={setSelectedYear} options={yearOptions} />
              <FilterSelect label="Negocio" value={selectedNegocio} onChange={setSelectedNegocio} options={negocioOptions} />
              <FilterSelect label="Linea" value={selectedLinea} onChange={setSelectedLinea} options={lineaOptions} />
              <FilterSelect label="Ejecutivo" value={selectedEjecutivo} onChange={setSelectedEjecutivo} options={ejecutivoOptions} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Ventas netas"
            value={formatCurrency(analytics.totalVentasNetas)}
            subtitle="Suma visible considerando signos negativos por devoluciones"
            icon={Gauge}
          />
          <KpiCard
            title="Crecimiento MoM"
            value={formatPercent(analytics.momGrowth)}
            subtitle={analytics.currentPeriod ? `Comparado contra ${analytics.previousPeriod?.label ?? "base previa"}` : "Sin periodo comparable"}
            icon={analytics.momGrowth !== null && analytics.momGrowth < 0 ? TrendingDown : TrendingUp}
          />
          <KpiCard
            title="Concentracion clientes"
            value={formatPercent(analytics.top2Share)}
            subtitle="Peso de los 2 clientes mas grandes del ultimo mes visible"
            icon={UsersRound}
          />
          <KpiCard
            title="Dependencia top ejecutivo"
            value={formatPercent(analytics.topExecutiveShare)}
            subtitle="Peso del ejecutivo lider en el ultimo mes visible"
            icon={ShieldAlert}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-amber-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Semaforo de riesgo</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Lo que realmente hay que vigilar</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className={`rounded-3xl border p-4 ${toneClasses(riskTone(analytics.top2Share, 45, 60))}`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em]">Concentracion clientes</p>
                <p className="mt-2 text-3xl font-bold">{formatPercent(analytics.top2Share)}</p>
                <p className="mt-2 text-sm">Si 2 clientes concentran demasiado, el negocio queda fragil.</p>
              </div>
              <div className={`rounded-3xl border p-4 ${toneClasses(riskTone(analytics.topExecutiveShare, 30, 40))}`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em]">Dependencia comercial</p>
                <p className="mt-2 text-3xl font-bold">{formatPercent(analytics.topExecutiveShare)}</p>
                <p className="mt-2 text-sm">Mide cuan expuesto estas a una sola persona en ventas.</p>
              </div>
              <div className={`rounded-3xl border p-4 ${toneClasses(momentumTone(analytics.momGrowth))}`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em]">Momentum mensual</p>
                <p className="mt-2 text-3xl font-bold">{formatPercent(analytics.momGrowth)}</p>
                <p className="mt-2 text-sm">Caidas abruptas aparecen aqui antes que en el resto de dashboards.</p>
              </div>
              <div className={`rounded-3xl border p-4 ${toneClasses(riskTone(analytics.returnRate, 5, 8))}`}>
                <p className="text-xs font-bold uppercase tracking-[0.18em]">Devoluciones</p>
                <p className="mt-2 text-3xl font-bold">{formatPercent(analytics.returnRate)}</p>
                <p className="mt-2 text-sm">Devolucion visible sobre venta neta acumulada.</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {analytics.insights.map((insight) => (
                <div key={insight} className="rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                  {insight}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pulso mensual</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Ventas netas vs devoluciones</h2>
            <p className="mt-2 text-sm text-slate-400">Aqui se ve si el negocio crece de verdad o si solo cambia de forma erratica.</p>

            <div className="mt-6 h-[380px]">
              {periodMetrics.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={periodMetrics}>
                    <defs>
                      <linearGradient id="health-sales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(Number(value))} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="total" name="Ventas netas" stroke="#38bdf8" fill="url(#health-sales)" strokeWidth={3} />
                    <Area type="monotone" dataKey="devoluciones" name="Devoluciones" stroke="#f43f5e" fillOpacity={0} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                  No hay meses suficientes para construir el pulso del negocio.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Anclas del periodo</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Clientes que mas pesan en la foto actual</h2>
            </div>
            <p className="text-sm text-slate-500">{analytics.currentPeriod ? analytics.currentPeriod.label : "Sin periodo visible"}</p>
          </div>

          <div className="mt-6 h-[340px]">
            {analytics.topClients.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topClients} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCurrencyCompact(Number(value))} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="cliente" width={180} tick={{ fill: "rgba(255,255,255,0.8)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="ventasMonto" name="Venta neta" radius={[0, 8, 8, 0]}>
                    {analytics.topClients.map((entry, index) => (
                      <Cell key={entry.cliente} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                No hay clientes suficientes bajo estos filtros.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
