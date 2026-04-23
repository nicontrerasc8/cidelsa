"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BriefcaseBusiness,
  CalendarRange,
  Crown,
  Layers3,
  TrendingUp,
  UserRound,
  UsersRound,
} from "lucide-react";

import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { SalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";

const ALL_VALUE = "__all__";
const CHART_COLORS = ["#7dd3fc", "#38bdf8", "#f59e0b", "#34d399", "#f472b6", "#818cf8"] as const;

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

type LeaderRow = {
  name: string;
  ventasMonto: number;
  operaciones: number;
  sharePct: number;
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
        "rounded-[28px] border border-white/10 bg-[#0d1524]/88 shadow-[0_20px_60px_rgba(2,8,23,0.45)] backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/62">
        {label}
      </span>
      <select
        className="h-11 w-full rounded-2xl border border-white/12 bg-white/8 px-3 text-sm text-white outline-none transition focus:border-white/30"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
          <p className="text-sm text-white/65">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p className="mt-2 text-xs text-white/45">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/6 p-3 text-white/85">
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
    <div className="rounded-2xl border border-white/10 bg-[#07101d]/95 p-4 shadow-2xl">
      {label !== undefined ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
          {label}
        </p>
      ) : null}
      <div className="space-y-2">
        {payload.map((item, index) => (
          <div
            key={`${String(item.name)}-${String(item.value)}-${index}`}
            className="flex items-center justify-between gap-6"
          >
            <div className="flex items-center gap-2 text-sm text-white/78">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill }}
              />
              {item.name}
            </div>
            <span className="text-sm font-semibold text-white">
              {String(item.name).includes("%")
                ? `${Number(item.value ?? 0).toFixed(1)}%`
                : formatCurrency(Number(item.value ?? 0))}
            </span>
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

function buildLeaderRows(
  rows: SalesByClientSummary["rows"],
  keySelector: (row: SalesByClientSummary["rows"][number]) => string | null,
) {
  const grouped = new Map<string, { ventasMonto: number; operaciones: number }>();

  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;

    const current = grouped.get(key) ?? { ventasMonto: 0, operaciones: 0 };
    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    grouped.set(key, current);
  }

  const total = [...grouped.values()].reduce((sum, row) => sum + row.ventasMonto, 0);

  return [...grouped.entries()]
    .map<LeaderRow>(([name, value]) => ({
      name,
      ventasMonto: value.ventasMonto,
      operaciones: value.operaciones,
      sharePct: total ? (value.ventasMonto / total) * 100 : 0,
    }))
    .sort((a, b) => b.ventasMonto - a.ventasMonto);
}

export function SalesYearComparisonDashboard({
  summary,
}: {
  summary: SalesByClientSummary;
}) {
  const [selectedNegocio, setSelectedNegocio] = useState<string>("GEOSINTETICOS");
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>(ALL_VALUE);

  const availableNegocios = useMemo(
    () => summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
    [summary.negocios],
  );

  const availableLineas = useMemo(() => {
    const lineas = new Set<string>();

    for (const row of summary.rows) {
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (row.linea) lineas.add(row.linea);
    }

    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedNegocio, summary.rows]);

  const availableEjecutivos = useMemo(() => {
    const ejecutivos = new Set<string>();

    for (const row of summary.rows) {
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;
      if (row.ejecutivo) ejecutivos.add(row.ejecutivo);
    }

    return [...ejecutivos].sort((a, b) => a.localeCompare(b));
  }, [selectedLinea, selectedNegocio, summary.rows]);

  const filteredRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
        if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
        if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
        return true;
      }),
    [selectedEjecutivo, selectedLinea, selectedNegocio, summary.rows],
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
      yoyPct:
        index > 0 ? percentChange(row.ventasMonto, values[index - 1]?.ventasMonto ?? 0) : null,
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

  const lineLeaders = useMemo(
    () => buildLeaderRows(filteredRows, (row) => row.linea).slice(0, 8),
    [filteredRows],
  );
  const executiveLeaders = useMemo(
    () => buildLeaderRows(filteredRows, (row) => row.ejecutivo).slice(0, 8),
    [filteredRows],
  );
  const clientLeaders = useMemo(
    () => buildLeaderRows(filteredRows, (row) => row.cliente).slice(0, 6),
    [filteredRows],
  );

  const concentrationTop3 = lineLeaders.slice(0, 3).reduce((sum, row) => sum + row.sharePct, 0);

  const negocioOptions = [{ label: "Todos los negocios", value: ALL_VALUE }].concat(
    availableNegocios,
  );
  const lineaOptions = [{ label: "Todas las lineas", value: ALL_VALUE }].concat(
    availableLineas.map((linea) => ({ label: linea, value: linea })),
  );
  const ejecutivoOptions = [{ label: "Todos los ejecutivos", value: ALL_VALUE }].concat(
    availableEjecutivos.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo })),
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#173057_0%,#08111f_36%,#030712_100%)] text-white">
      <div className="mx-auto max-w-[1550px] space-y-8 px-6 py-10">
        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,25,49,0.98)_0%,rgba(18,44,77,0.96)_38%,rgba(130,185,224,0.34)_100%)] p-6 shadow-[0_24px_80px_rgba(2,8,23,0.45)]">
          <div className="absolute -right-12 top-0 h-56 w-56 rounded-full bg-sky-300/14 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/65">
                Dashboard comparativo
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                Ventas por año con señal real de negocio
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/72">
                El foco dejó de ser solo cuánto se vendió. Aquí ves qué año dominó,
                cómo se distribuye la venta, qué líneas concentran el negocio y
                qué ejecutivos realmente sostienen el resultado.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/82">
                  Negocio: {selectedNegocio === ALL_VALUE ? "Todos" : selectedNegocio}
                </div>
                <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/82">
                  Línea: {selectedLinea === ALL_VALUE ? "Todas" : selectedLinea}
                </div>
                <div className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-white/82">
                  Ejecutivo: {selectedEjecutivo === ALL_VALUE ? "Todos" : selectedEjecutivo}
                </div>
              </div>
            </div>

            <div className="grid w-full gap-3 rounded-[28px] border border-white/10 bg-[#08101d]/65 p-4 backdrop-blur xl:max-w-[620px] xl:grid-cols-3">
              <FilterSelect
                label="Negocio"
                value={selectedNegocio}
                options={negocioOptions}
                onChange={(value) => {
                  setSelectedNegocio(value);
                  setSelectedLinea(ALL_VALUE);
                  setSelectedEjecutivo(ALL_VALUE);
                }}
              />
              <FilterSelect
                label="Línea"
                value={selectedLinea}
                options={lineaOptions}
                onChange={(value) => {
                  setSelectedLinea(value);
                  setSelectedEjecutivo(ALL_VALUE);
                }}
              />
              <FilterSelect
                label="Ejecutivo"
                value={selectedEjecutivo}
                options={ejecutivoOptions}
                onChange={setSelectedEjecutivo}
              />
            </div>
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
            subtitle="Crecimiento del último año vs el anterior"
            icon={Layers3}
            accent="bg-[linear-gradient(90deg,#a78bfa_0%,#818cf8_100%)]"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <Surface className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
                  Evolución anual
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Ventas, share y ticket promedio por año
                </h2>
              </div>
              <p className="text-sm text-white/52">
                La línea muestra ticket promedio y las barras revelan la masa real de ventas.
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
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/4 text-sm text-white/60">
                  No hay datos para la combinación seleccionada.
                </div>
              )}
            </div>
          </Surface>

          <Surface className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/42">
              Lectura ejecutiva
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Qué está pasando de verdad
            </h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Año dominante</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {bestYear ? bestYear.year : "Sin datos"}
                </p>
                <p className="mt-2 text-sm text-white/62">
                  {bestYear
                    ? `${formatCurrency(bestYear.ventasMonto)} y ${bestYear.sharePct.toFixed(1)}% del total visible.`
                    : "No hay un año dominante con los filtros actuales."}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/42">Concentración</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {concentrationTop3.toFixed(1)}%
                </p>
                <p className="mt-2 text-sm text-white/62">
                  Las 3 líneas principales explican este porcentaje de la venta visible.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/42">Línea líder</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {lineLeaders[0]?.name ?? "Sin línea"}
                  </p>
                  <p className="mt-2 text-sm text-white/62">
                    {lineLeaders[0]
                      ? `${formatCurrency(lineLeaders[0].ventasMonto)}`
                      : "No hay señal suficiente."}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/8 bg-white/4 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/42">Ejecutivo líder</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {executiveLeaders[0]?.name ?? "Sin ejecutivo"}
                  </p>
                  <p className="mt-2 text-sm text-white/62">
                    {executiveLeaders[0]
                      ? `${formatCurrency(executiveLeaders[0].ventasMonto)}`
                      : "No hay señal suficiente."}
                  </p>
                </div>
              </div>
            </div>
          </Surface>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
          <Surface className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Mix por línea
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Dónde se concentra la venta</h3>
              </div>
              <BriefcaseBusiness className="size-5 text-white/50" />
            </div>
            <div className="mt-6 h-[340px]">
              {lineLeaders.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...lineLeaders].reverse()} layout="vertical" margin={{ left: 14, right: 10, top: 8, bottom: 8 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 12 }} tickFormatter={(value) => formatCurrency(Number(value))} />
                    <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.82)", fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ventasMonto" name="Ventas">
                      {[...lineLeaders].reverse().map((row, index) => (
                        <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/4 text-sm text-white/60">
                  No hay líneas para mostrar.
                </div>
              )}
            </div>
          </Surface>

          <Surface className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Mix por ejecutivo
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Quién sostiene el resultado</h3>
              </div>
              <UserRound className="size-5 text-white/50" />
            </div>
            <div className="mt-6 h-[340px]">
              {executiveLeaders.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={executiveLeaders.slice(0, 6)}
                      dataKey="ventasMonto"
                      nameKey="name"
                      innerRadius={76}
                      outerRadius={120}
                      paddingAngle={4}
                    >
                      {executiveLeaders.slice(0, 6).map((row, index) => (
                        <Cell key={row.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/4 text-sm text-white/60">
                  No hay ejecutivos para mostrar.
                </div>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {executiveLeaders.slice(0, 4).map((row, index) => (
                <div key={row.name} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="text-sm text-white/82">{row.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{row.sharePct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                  Clientes ancla
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">Quién aporta volumen</h3>
              </div>
              <UsersRound className="size-5 text-white/50" />
            </div>
            <div className="mt-5 space-y-3">
              {clientLeaders.length ? (
                clientLeaders.map((row, index) => (
                  <div key={row.name} className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {index + 1}. {row.name}
                        </p>
                        <p className="mt-1 text-xs text-white/48">
                          {row.operaciones} registros
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {formatCurrency(row.ventasMonto)}
                        </p>
                        <p className="mt-1 text-xs text-white/48">{row.sharePct.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/4 p-6 text-sm text-white/60">
                  No hay clientes suficientes para el ranking.
                </div>
              )}
            </div>
          </Surface>
        </section>

        <Surface className="overflow-hidden">
          <div className="border-b border-white/8 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
              Detalle anual
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Participación, crecimiento y profundidad por año
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-white/4 text-xs uppercase tracking-[0.18em] text-white/42">
                <tr>
                  <th className="px-6 py-4">Año</th>
                  <th className="px-6 py-4 text-right">Ventas</th>
                  <th className="px-6 py-4 text-right">Share</th>
                  <th className="px-6 py-4 text-right">YoY</th>
                  <th className="px-6 py-4 text-right">Ticket prom.</th>
                  <th className="px-6 py-4 text-right">Líneas</th>
                  <th className="px-6 py-4 text-right">Ejecutivos</th>
                  <th className="px-6 py-4 text-right">Clientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {yearlyComparison.length ? (
                  yearlyComparison.map((row) => (
                    <tr key={row.year} className="hover:bg-white/4">
                      <td className="px-6 py-4 font-semibold text-white">{row.year}</td>
                      <td className="px-6 py-4 text-right text-white">{formatCurrency(row.ventasMonto)}</td>
                      <td className="px-6 py-4 text-right text-white/72">{row.sharePct.toFixed(1)}%</td>
                      <td className={cn("px-6 py-4 text-right font-medium", row.yoyPct === null ? "text-white/38" : row.yoyPct >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {row.yoyPct === null ? "Base" : `${row.yoyPct >= 0 ? "+" : ""}${row.yoyPct.toFixed(1)}%`}
                      </td>
                      <td className="px-6 py-4 text-right text-white/82">{formatCurrency(row.avgTicket)}</td>
                      <td className="px-6 py-4 text-right text-white/72">{formatNumber(row.lineas)}</td>
                      <td className="px-6 py-4 text-right text-white/72">{formatNumber(row.ejecutivos)}</td>
                      <td className="px-6 py-4 text-right text-white/72">{formatNumber(row.clientes)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center text-white/55">
                      No hay comparativos anuales para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>
    </div>
  );
}
