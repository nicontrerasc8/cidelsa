"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layers3, UsersRound } from "lucide-react";

import type { CommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

const ALL_VALUE = "__all__";
const COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"] as const;

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0);
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

function TableCell({
  value,
  maxValue,
}: {
  value: number;
  maxValue: number;
}) {
  const intensity = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
  return (
    <td
      className="rounded-xl px-3 py-2 text-center text-xs font-semibold text-white"
      style={{ backgroundColor: `rgba(56, 189, 248, ${0.08 + intensity * 0.62})` }}
    >
      {value.toFixed(0)}%
    </td>
  );
}

export function ClientCohortsDashboard({
  summary,
  title = "Cohortes de clientes",
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
        return row.activityYear !== null;
      }),
    [selectedEjecutivo, selectedLinea, selectedNegocio, selectedYear, summary.rows],
  );

  const analytics = useMemo(() => {
    const firstPurchase = new Map<string, number>();
    for (const row of filteredRows) {
      if (row.activityYear === null) continue;
      const current = firstPurchase.get(row.cliente);
      if (current === undefined || row.activityYear < current) {
        firstPurchase.set(row.cliente, row.activityYear);
      }
    }

    const cohortMeta = new Map<
      number,
      {
        clients: Set<string>;
        retention: Map<number, Set<string>>;
        revenue: number;
      }
    >();

    for (const [cliente, cohortYear] of firstPurchase.entries()) {
      const current =
        cohortMeta.get(cohortYear) ??
        { clients: new Set<string>(), retention: new Map<number, Set<string>>(), revenue: 0 };
      current.clients.add(cliente);
      cohortMeta.set(cohortYear, current);
    }

    for (const row of filteredRows) {
      if (row.activityYear === null) continue;
      const cohortYear = firstPurchase.get(row.cliente);
      if (cohortYear === undefined) continue;
      const age = row.activityYear - cohortYear;
      const current = cohortMeta.get(cohortYear);
      if (!current) continue;

      current.revenue += row.ventasMonto;
      const ageBucket = current.retention.get(age) ?? new Set<string>();
      ageBucket.add(row.cliente);
      current.retention.set(age, ageBucket);
    }

    const cohorts = [...cohortMeta.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([cohortYear, value]) => {
        const size = value.clients.size;
        const retentionEntries = [...value.retention.entries()].sort((a, b) => a[0] - b[0]);
        return {
          cohortYear,
          size,
          revenue: value.revenue,
          ages: retentionEntries.map(([age, clients]) => ({
            age,
            retainedClients: clients.size,
            retentionPct: size ? (clients.size / size) * 100 : 0,
          })),
        };
      });

    const maxAge = cohorts.reduce((max, cohort) => Math.max(max, cohort.ages.at(-1)?.age ?? 0), 0);
    const calendarYears = [...new Set(filteredRows.map((row) => row.activityYear).filter((year): year is number => year !== null))].sort((a, b) => a - b);
    const retentionLines = Array.from({ length: maxAge + 1 }, (_, age) => {
      const point: Record<string, string | number> = { age: `A${age}` };
      for (const cohort of cohorts) {
        point[String(cohort.cohortYear)] = cohort.ages.find((entry) => entry.age === age)?.retentionPct ?? 0;
      }
      return point;
    });

    const matrixRows = cohorts.map((cohort) => ({
      ...cohort,
      years: calendarYears.map((year) => ({
        year,
        retentionPct: cohort.ages.find((entry) => cohort.cohortYear + entry.age === year)?.retentionPct ?? 0,
      })),
    }));

    const bestCohort = [...cohorts]
      .sort((a, b) => (b.ages.at(-1)?.retentionPct ?? 0) - (a.ages.at(-1)?.retentionPct ?? 0))[0] ?? null;
    const topRevenueCohort = [...cohorts].sort((a, b) => b.revenue - a.revenue)[0] ?? null;
    const maxRetention = cohorts.reduce(
      (max, cohort) => Math.max(max, ...cohort.ages.map((age) => age.retentionPct), 0),
      0,
    );

    return {
      cohorts,
      maxAge,
      calendarYears,
      retentionLines,
      bestCohort,
      matrixRows,
      topRevenueCohort,
      maxRetention,
    };
  }, [filteredRows]);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#10294b_0%,#08111d_38%,#030712_100%)] text-white">
      <div className="mx-auto max-w-[1550px] space-y-8 px-6 py-10">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Nivel pro</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Agrupa clientes por anio de primera compra y revela cuales cohortes retienen mejor y generan mas revenue.
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
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Cohortes activas</p>
            <p className="mt-2 text-3xl font-bold text-white">{analytics.cohorts.length}</p>
            <p className="mt-2 text-xs text-slate-500">Anos de primera compra visibles</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Mejor cohorte</p>
            <p className="mt-2 text-3xl font-bold text-white">{analytics.bestCohort?.cohortYear ?? "N/A"}</p>
            <p className="mt-2 text-xs text-slate-500">Retencion final mas alta</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Revenue lider</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatCurrencyCompact(analytics.topRevenueCohort?.revenue ?? 0)}</p>
            <p className="mt-2 text-xs text-slate-500">Cohorte que mas dinero acumulado genera</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Insight</p>
              <p className="mt-2 text-xl font-bold text-white">
              {analytics.topRevenueCohort
                ? `Clientes ${analytics.topRevenueCohort.cohortYear} sostienen mejor el negocio a lo largo del tiempo.`
                : "Sin cohortes visibles"}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <UsersRound className="size-5 text-sky-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Retencion por edad</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Como envejecen las cohortes</h2>
              </div>
            </div>

            <div className="mt-6 h-[380px]">
              {analytics.retentionLines.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.retentionLines}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Legend />
                    {analytics.cohorts.map((cohort, index) => (
                      <Line
                        key={cohort.cohortYear}
                        type="monotone"
                        dataKey={String(cohort.cohortYear)}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={3}
                        dot={{ r: 3 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                  No hay base suficiente para cohortes.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <Layers3 className="size-5 text-emerald-300" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Revenue por cohorte</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Quien genera mas dinero</h2>
              </div>
            </div>

            <div className="mt-6 h-[380px]">
              {analytics.cohorts.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.cohorts}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="cohortYear" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(value) => formatCurrencyCompact(Number(value))} tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                  No hay revenue cohort para mostrar.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Matriz de cohortes</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Retencion por anio calendario</h2>
            </div>
            <p className="text-sm text-slate-500">Cada celda muestra % de clientes activos sobre el tamano original de la cohorte en cada anio real.</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[760px] border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-slate-400">Cohorte</th>
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.18em] text-slate-400">Base</th>
                  {analytics.calendarYears.map((year) => (
                    <th key={year} className="px-3 py-2 text-center text-xs uppercase tracking-[0.18em] text-slate-400">
                      {year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.matrixRows.length ? (
                  analytics.matrixRows.map((cohort) => (
                    <tr key={cohort.cohortYear}>
                      <td className="rounded-xl bg-white/5 px-3 py-2 font-semibold text-white">{cohort.cohortYear}</td>
                      <td className="rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-300">{cohort.size} clientes</td>
                      {cohort.years.map((entry) => (
                        <TableCell key={`${cohort.cohortYear}-${entry.year}`} value={entry.retentionPct} maxValue={analytics.maxRetention} />
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={analytics.calendarYears.length + 2} className="rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-500">
                      No hay cohortes suficientes para construir la matriz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
