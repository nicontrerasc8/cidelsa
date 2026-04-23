"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Repeat2, UserMinus, UserPlus, UsersRound } from "lucide-react";

import type { CommercialHealthSummary } from "@/modules/dashboard/services/commercial-health";

const ALL_VALUE = "__all__";
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

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

export function RetentionChurnDashboard({
  summary,
  title = "Retencion vs churn",
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
        if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
        if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
        if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
        if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
        return row.importYear !== null && row.monthIndex !== null;
      }),
    [selectedEjecutivo, selectedLinea, selectedNegocio, selectedYear, summary.rows],
  );

  const transitions = useMemo(() => {
    const byPeriod = new Map<string, { year: number; monthIndex: number; label: string; clients: Set<string> }>();

    for (const row of filteredRows) {
      const key = `${row.importYear}-${String((row.monthIndex ?? 0) + 1).padStart(2, "0")}`;
      const current =
        byPeriod.get(key) ??
        {
          year: row.importYear as number,
          monthIndex: row.monthIndex as number,
          label: `${MONTHS[row.monthIndex as number]} ${row.importYear as number}`,
          clients: new Set<string>(),
        };
      current.clients.add(row.cliente);
      byPeriod.set(key, current);
    }

    const periods = [...byPeriod.values()].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthIndex - b.monthIndex;
    });

    const items: Array<{
      label: string;
      newClients: number;
      lostClients: number;
      retainedClients: number;
      previousClients: number;
      currentClients: number;
      retentionRate: number | null;
      churnRate: number | null;
    }> = [];

    for (let index = 1; index < periods.length; index += 1) {
      const previous = periods[index - 1];
      const current = periods[index];

      let retainedClients = 0;
      for (const client of current.clients) {
        if (previous.clients.has(client)) retainedClients += 1;
      }

      let lostClients = 0;
      for (const client of previous.clients) {
        if (!current.clients.has(client)) lostClients += 1;
      }

      const newClients = [...current.clients].filter((client) => !previous.clients.has(client)).length;

      items.push({
        label: current.label,
        newClients,
        lostClients,
        retainedClients,
        previousClients: previous.clients.size,
        currentClients: current.clients.size,
        retentionRate: previous.clients.size ? (retainedClients / previous.clients.size) * 100 : null,
        churnRate: previous.clients.size ? (lostClients / previous.clients.size) * 100 : null,
      });
    }

    return items;
  }, [filteredRows]);

  const latest = transitions.at(-1) ?? null;

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#173457_0%,#08111d_38%,#030712_100%)] text-white">
      <div className="mx-auto max-w-[1550px] space-y-8 px-6 py-10">
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)] backdrop-blur">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">Clientes B2B</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Distingue clientes nuevos, recurrentes y perdidos para leer retencion real, no solo ventas.
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Clientes nuevos</p>
            <p className="mt-2 text-3xl font-bold text-white">{latest?.newClients ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Ultimo periodo visible</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Clientes perdidos</p>
            <p className="mt-2 text-3xl font-bold text-white">{latest?.lostClients ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Salieron del periodo mas reciente</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Clientes recurrentes</p>
            <p className="mt-2 text-3xl font-bold text-white">{latest?.retainedClients ?? 0}</p>
            <p className="mt-2 text-xs text-slate-500">Se mantuvieron entre dos meses</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Retencion</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatPercent(latest?.retentionRate ?? null)}</p>
            <p className="mt-2 text-xs text-slate-500">Clientes retenidos sobre base previa</p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-slate-900/55 p-5 shadow-2xl backdrop-blur">
            <p className="text-sm text-slate-400">Churn</p>
            <p className="mt-2 text-3xl font-bold text-white">{formatPercent(latest?.churnRate ?? null)}</p>
            <p className="mt-2 text-xs text-slate-500">Clientes perdidos sobre base previa</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Flujo reciente</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Lectura tipo sankey simplificada</h2>

            {latest ? (
              <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-center">
                  <UsersRound className="mx-auto size-6 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-400">Base previa</p>
                  <p className="mt-1 text-3xl font-bold text-white">{latest.previousClients}</p>
                </div>
                <ArrowRight className="mx-auto hidden size-5 text-slate-500 md:block" />
                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                  <Repeat2 className="mx-auto size-6 text-emerald-300" />
                  <p className="mt-3 text-sm text-emerald-100">Recurrentes</p>
                  <p className="mt-1 text-3xl font-bold text-white">{latest.retainedClients}</p>
                </div>
                <ArrowRight className="mx-auto hidden size-5 text-slate-500 md:block" />
                <div className="rounded-3xl border border-sky-500/20 bg-sky-500/10 p-5 text-center">
                  <UserPlus className="mx-auto size-6 text-sky-300" />
                  <p className="mt-3 text-sm text-sky-100">Nuevos</p>
                  <p className="mt-1 text-3xl font-bold text-white">{latest.newClients}</p>
                </div>
                <ArrowRight className="mx-auto hidden size-5 text-slate-500 md:block" />
                <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
                  <UserMinus className="mx-auto size-6 text-rose-300" />
                  <p className="mt-3 text-sm text-rose-100">Perdidos</p>
                  <p className="mt-1 text-3xl font-bold text-white">{latest.lostClients}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex h-48 items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                No hay dos periodos consecutivos para medir churn.
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Insight</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Que cambia de un mes al otro</h2>
            <div className="mt-6 space-y-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {latest
                  ? `${latest.newClients} clientes entraron, ${latest.retainedClients} siguieron activos y ${latest.lostClients} se perdieron en ${latest.label}.`
                  : "Sin base temporal para leer retencion."}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                {latest && latest.churnRate !== null && latest.churnRate >= 25
                  ? "El churn ya esta en una zona delicada y requiere accion comercial."
                  : "La retencion visible no muestra una fuga extrema por ahora."}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Serie temporal</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Nuevos vs recurrentes vs perdidos</h2>
            </div>
            <p className="text-sm text-slate-500">Cada barra resume lo que paso al entrar en el periodo.</p>
          </div>

          <div className="mt-6 h-[380px]">
            {transitions.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transitions}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="retainedClients" stackId="clients" name="Recurrentes" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="newClients" stackId="clients" name="Nuevos" fill="#38bdf8" />
                  <Bar dataKey="lostClients" stackId="clients" name="Perdidos" fill="#f43f5e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 text-sm text-slate-500">
                No hay suficientes periodos para construir la serie.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
