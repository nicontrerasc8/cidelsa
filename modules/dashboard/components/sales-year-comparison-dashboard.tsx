"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, Crown, Filter, Layers3, TrendingUp } from "lucide-react";

import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { SalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";

type YearAggregate = {
  year: number;
  ventasMonto: number;
  operaciones: number;
  clientes: number;
  ejecutivos: number;
  lineas: number;
  avgTicket: number;
  sharePct: number;
  yoyPct: number | null;
};

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-slate-800 bg-slate-900/40 shadow-[0_20px_60px_rgba(2,8,23,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
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

function KpiPanel({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof TrendingUp;
  accent: string;
}) {
  return (
    <Surface className="relative overflow-hidden p-5">
      <div className={cn("absolute inset-x-0 top-0 h-1", accent)} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-slate-200">
          <Icon className="size-5" />
        </div>
      </div>
    </Surface>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      {label !== undefined ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
      ) : null}
      <div className="space-y-2">
        {payload.map((item, index) => (
          <div key={`${String(item.name)}-${String(item.value)}-${index}`} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
              {item.name}
            </div>
            <span className="text-sm font-semibold text-white">{formatCurrency(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

export function SalesYearComparisonDashboard({
  summary,
}: {
  summary: SalesByClientSummary;
}) {
  const defaultNegocios = summary.negocios.includes("Geosinteticos") ? ["Geosinteticos"] : [];
  const [selectedNegocios, setSelectedNegocios] = useState<string[]>(defaultNegocios);
  const [selectedLineas, setSelectedLineas] = useState<string[]>([]);
  const [selectedEjecutivos, setSelectedEjecutivos] = useState<string[]>([]);

  const availableLineas = useMemo(() => {
    const lineas = new Set<string>();

    for (const row of summary.rows) {
      if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) continue;
      if (row.linea) lineas.add(row.linea);
    }

    return [...lineas].sort((a, b) => a.localeCompare(b, "es"));
  }, [selectedNegocios, summary.rows]);

  const availableEjecutivos = useMemo(() => {
    const ejecutivos = new Set<string>();

    for (const row of summary.rows) {
      if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) continue;
      if (selectedLineas.length > 0 && (!row.linea || !selectedLineas.includes(row.linea))) continue;
      if (row.ejecutivo) ejecutivos.add(row.ejecutivo);
    }

    return [...ejecutivos].sort((a, b) => a.localeCompare(b, "es"));
  }, [selectedLineas, selectedNegocios, summary.rows]);

  const filteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedNegocios.length > 0 && (!row.negocio || !selectedNegocios.includes(row.negocio))) return false;
        if (selectedLineas.length > 0 && (!row.linea || !selectedLineas.includes(row.linea))) return false;
        if (selectedEjecutivos.length > 0 && (!row.ejecutivo || !selectedEjecutivos.includes(row.ejecutivo))) return false;
        return true;
      }),
    [selectedEjecutivos, selectedLineas, selectedNegocios, summary.rows],
  );

  const yearlyComparison = useMemo(() => {
    const aggregates = new Map<
      number,
      {
        year: number;
        ventasMonto: number;
        operaciones: number;
        clientes: Set<string>;
        ejecutivos: Set<string>;
        lineas: Set<string>;
      }
    >();

    for (const row of filteredRows) {
      if (row.importYear === null) continue;

      const current =
        aggregates.get(row.importYear) ??
        {
          year: row.importYear,
          ventasMonto: 0,
          operaciones: 0,
          clientes: new Set<string>(),
          ejecutivos: new Set<string>(),
          lineas: new Set<string>(),
        };

      current.ventasMonto += row.ventasMonto;
      current.operaciones += 1;
      current.clientes.add(row.cliente);
      if (row.ejecutivo) current.ejecutivos.add(row.ejecutivo);
      if (row.linea) current.lineas.add(row.linea);
      aggregates.set(row.importYear, current);
    }

    const values = [...aggregates.values()].sort((a, b) => a.year - b.year);
    const total = values.reduce((sum, row) => sum + row.ventasMonto, 0);

    return values.map<YearAggregate>((row, index) => ({
      year: row.year,
      ventasMonto: row.ventasMonto,
      operaciones: row.operaciones,
      clientes: row.clientes.size,
      ejecutivos: row.ejecutivos.size,
      lineas: row.lineas.size,
      avgTicket: row.operaciones ? row.ventasMonto / row.operaciones : 0,
      sharePct: total ? (row.ventasMonto / total) * 100 : 0,
      yoyPct: index > 0 ? percentChange(row.ventasMonto, values[index - 1]?.ventasMonto ?? 0) : null,
    }));
  }, [filteredRows]);

  const totalVentas = yearlyComparison.reduce((sum, row) => sum + row.ventasMonto, 0);
  const totalOperaciones = yearlyComparison.reduce((sum, row) => sum + row.operaciones, 0);
  const avgTicket = totalOperaciones ? totalVentas / totalOperaciones : 0;
  const bestYear = yearlyComparison.reduce<YearAggregate | null>((best, row) => {
    if (!best || row.ventasMonto > best.ventasMonto) return row;
    return best;
  }, null);
  const latestGrowth = yearlyComparison.at(-1)?.yoyPct ?? null;

  const selectedNegocioLabel = selectedNegocios.length ? selectedNegocios.join(", ") : "Todos";
  const selectedLineaLabel = selectedLineas.length ? selectedLineas.join(", ") : "Todas";
  const selectedEjecutivoLabel = selectedEjecutivos.length ? selectedEjecutivos.join(", ") : "Todos";

  return (
    <div className="min-h-screen bg-[#05080f] text-white">
      <div className="mx-auto max-w-[1550px] space-y-8 px-6 py-10">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-400">
              Dashboard comparativo
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Ventas por año con señal real de negocio
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              Evolucion anual de ventas bajo filtros multiples por negocio, linea y ejecutivo.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                Negocio: {selectedNegocioLabel}
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                Linea: {selectedLineaLabel}
              </div>
              <div className="rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-300">
                Ejecutivo: {selectedEjecutivoLabel}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 flex items-center gap-2 px-1 text-slate-400">
            <Filter className="size-4" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Filtros multiples</span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          <KpiPanel
            title="Ventas visibles"
            value={formatCurrency(totalVentas)}
            subtitle="Monto total bajo los filtros actuales"
            icon={TrendingUp}
            accent="bg-[linear-gradient(90deg,#38bdf8_0%,#0ea5e9_100%)]"
          />
          <KpiPanel
            title="Ticket promedio"
            value={formatCurrency(avgTicket)}
            subtitle={`${formatNumber(totalOperaciones)} registros considerados`}
            icon={CalendarRange}
            accent="bg-[linear-gradient(90deg,#34d399_0%,#10b981_100%)]"
          />
          <KpiPanel
            title="Mejor año"
            value={bestYear ? `${bestYear.year}` : "Sin datos"}
            subtitle={bestYear ? formatCurrency(bestYear.ventasMonto) : "Ajusta filtros"}
            icon={Crown}
            accent="bg-[linear-gradient(90deg,#f59e0b_0%,#fbbf24_100%)]"
          />
          <KpiPanel
            title="Momentum reciente"
            value={latestGrowth === null ? "N/A" : `${latestGrowth >= 0 ? "+" : ""}${latestGrowth.toFixed(1)}%`}
            subtitle="Crecimiento del ultimo año vs el anterior"
            icon={Layers3}
            accent="bg-[linear-gradient(90deg,#a78bfa_0%,#818cf8_100%)]"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <Surface className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Evolucion anual
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Ventas y ticket promedio por año
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Las barras muestran ventas y la linea muestra ticket promedio.
              </p>
            </div>

            <div className="mt-6 h-[430px]">
              {yearlyComparison.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={yearlyComparison} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesYearArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="salesYearBars" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.82)", fontSize: 12 }} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area yAxisId="left" type="monotone" dataKey="ventasMonto" name="Ventas" stroke="#38bdf8" fill="url(#salesYearArea)" strokeWidth={2} />
                    <Bar yAxisId="left" dataKey="ventasMonto" name="Ventas" fill="url(#salesYearBars)" radius={[12, 12, 0, 0]} maxBarSize={70} />
                    <Line yAxisId="right" type="monotone" dataKey="avgTicket" name="Ticket promedio" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 text-sm text-slate-500">
                  No hay datos para la combinacion seleccionada.
                </div>
              )}
            </div>
          </Surface>

          <Surface className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Lectura ejecutiva
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Resumen anual
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Año dominante</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {bestYear ? bestYear.year : "Sin datos"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {bestYear
                    ? `${formatCurrency(bestYear.ventasMonto)} y ${bestYear.sharePct.toFixed(1)}% del total visible.`
                    : "No hay un año dominante con los filtros actuales."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Años visibles</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatNumber(yearlyComparison.length)}</p>
                  <p className="mt-2 text-sm text-slate-400">Periodos con ventas para la combinacion actual.</p>
                </div>
                <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Registros</p>
                  <p className="mt-2 text-lg font-semibold text-white">{formatNumber(totalOperaciones)}</p>
                  <p className="mt-2 text-sm text-slate-400">Operaciones usadas para este comparativo.</p>
                </div>
              </div>
            </div>
          </Surface>
        </section>
      </div>
    </div>
  );
}
