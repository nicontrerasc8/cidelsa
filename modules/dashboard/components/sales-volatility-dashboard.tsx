"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, AlertTriangle, Waves } from "lucide-react";

import type { CommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

const ALL_VALUE = "__all__";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

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
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(1)}%`;
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

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
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

export function SalesVolatilityDashboard({
  summary,
  title = "Variabilidad y volatilidad",
}: {
  summary: CommercialHealthSummary;
  title?: string;
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

  const monthlyTotals = useMemo(() => {
    const grouped = new Map<string, { year: number; monthIndex: number; total: number; label: string }>();

    for (const row of filteredRows) {
      if (row.activityYear === null || row.monthIndex === null) continue;
      const key = `${row.activityYear}-${String(row.monthIndex + 1).padStart(2, "0")}`;
      const current =
        grouped.get(key) ??
        {
          year: row.activityYear,
          monthIndex: row.monthIndex,
          total: 0,
          label: `${MONTHS[row.monthIndex]} ${row.activityYear}`,
        };
      current.total += row.ventasMonto;
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });
  }, [filteredRows]);

  const monthBand = useMemo(() => {
    const grouped = new Map<number, number[]>();

    for (const item of monthlyTotals) {
      const values = grouped.get(item.monthIndex) ?? [];
      values.push(item.total);
      grouped.set(item.monthIndex, values);
    }

    return MONTHS.map((month, monthIndex) => {
      const values = grouped.get(monthIndex) ?? [];
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return { month, min, max, avg };
    });
  }, [monthlyTotals]);

  const heatmapYears = useMemo(() => [...new Set(monthlyTotals.map((item) => item.year))], [monthlyTotals]);

  const analytics = useMemo(() => {
    const values = monthlyTotals.map((item) => item.total);
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const variance = values.length
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
      : 0;
    const deviation = Math.sqrt(variance);
    const cv = mean ? (deviation / Math.abs(mean)) * 100 : null;

    let monthsWithFall = 0;
    for (let index = 1; index < values.length; index += 1) {
      if (values[index] < values[index - 1]) monthsWithFall += 1;
    }

    const fallPct = values.length > 1 ? (monthsWithFall / (values.length - 1)) * 100 : null;

    return {
      deviation,
      cv,
      fallPct,
      instability:
        cv === null ? "Sin base" : cv >= 35 ? "Alta" : cv >= 20 ? "Media" : "Baja",
    };
  }, [monthlyTotals]);

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

  const heatmapMax = Math.max(...monthlyTotals.map((item) => Math.abs(item.total)), 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#1e293b_0%,#09111d_38%,#030712_100%)] text-white">
      <div className="mx-auto max-w-[1550px] space-y-8 px-6 py-10">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Estabilidad comercial</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Responde una pregunta clave: que tan inestable es el negocio cuando miras los meses en serio.
              </p>
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
          <KpiCard title="Desviacion mensual" value={formatCurrency(analytics.deviation)} subtitle="Dispersion de ventas entre meses visibles" />
          <KpiCard title="Coeficiente de variacion" value={formatPercent(analytics.cv)} subtitle="Volatilidad relativa sobre la media" />
          <KpiCard title="% meses con caida" value={formatPercent(analytics.fallPct)} subtitle="Cuantos meses terminan por debajo del anterior" />
          <KpiCard title="Nivel de inestabilidad" value={analytics.instability} subtitle="Lectura sintetica para management" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <Waves className="size-5 text-cyan-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Banda de variacion</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Minimo, maximo y promedio por mes</h2>
              </div>
            </div>
            <div className="mt-6 h-[380px]">
              {monthlyTotals.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthBand}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(Number(value))} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="max" name="Maximo" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.1} />
                    <Area type="monotone" dataKey="min" name="Minimo" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.08} />
                    <Line type="monotone" dataKey="avg" name="Promedio" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                  No hay meses suficientes para medir volatilidad.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <Activity className="size-5 text-amber-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Lectura rapida</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Que esta diciendo la dispersion</h2>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">
                  {analytics.cv !== null && analytics.cv >= 35
                    ? "La serie es muy inestable: el negocio cambia demasiado de un mes a otro."
                    : analytics.cv !== null && analytics.cv >= 20
                      ? "La variabilidad ya es relevante y puede distorsionar cualquier lectura lineal."
                      : "La volatilidad visible sigue en una zona relativamente controlada."}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-300">
                  {analytics.fallPct !== null && analytics.fallPct >= 50
                    ? "Mas de la mitad de los meses caen contra el anterior. Hay fragilidad estructural."
                    : "Las caidas no dominan la serie, pero igual conviene vigilar la secuencia de meses."}
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <AlertTriangle className="size-4 text-amber-300" />
                  El heatmap de abajo te muestra en que meses y anios se concentra la inestabilidad.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Heatmap</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Mes vs anio</h2>
            </div>
            <p className="text-sm text-slate-500">Cada bloque refleja venta neta del mes. Mas intenso = mayor magnitud.</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-[120px_repeat(12,minmax(0,1fr))] gap-2">
              <div />
              {MONTHS.map((month) => (
                <div key={month} className="px-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {month}
                </div>
              ))}
              {heatmapYears.length ? (
                heatmapYears.map((year) => (
                  <>
                    <div key={`${year}-label`} className="flex items-center text-sm font-semibold text-white">
                      {year}
                    </div>
                    {MONTHS.map((month, monthIndex) => {
                      const value = monthlyTotals.find((item) => item.year === year && item.monthIndex === monthIndex)?.total ?? 0;
                      const intensity = heatmapMax > 0 ? Math.min(Math.abs(value) / heatmapMax, 1) : 0;
                      return (
                        <div
                          key={`${year}-${month}`}
                          className="rounded-2xl border border-white/5 p-3 text-center text-xs font-medium text-white"
                          style={{
                            backgroundColor:
                              value >= 0
                                ? `rgba(56, 189, 248, ${0.14 + intensity * 0.56})`
                                : `rgba(244, 63, 94, ${0.14 + intensity * 0.56})`,
                          }}
                          title={`${month} ${year}: ${formatCurrency(value)}`}
                        >
                          {formatCurrencyCompact(value)}
                        </div>
                      );
                    })}
                  </>
                ))
              ) : (
                <div className="col-span-13 flex h-36 items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                  No hay matriz temporal disponible.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
