"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  BarChart3,
  CircleDollarSign,
  Crosshair,
  ListOrdered,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  SalesByExecutiveRow,
  SalesByExecutiveSummary,
} from "@/modules/dashboard/services/sales-by-executive";

const ALL_VALUE = "__all__";
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"] as const;
const CHART_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#a78bfa", "#fb7185", "#14b8a6", "#eab308", "#60a5fa"] as const;

type ExecutiveAggregate = {
  ejecutivo: string;
  ventasMonto: number;
  operaciones: number;
  clientes: number;
  lineas: number;
  ticketPromedio: number;
  share: number;
  bestLinea: string;
  bestLineaVentas: number;
  bestCliente: string;
  bestClienteVentas: number;
};

type Option = {
  label: string;
  value: string;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
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

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value)}%`;
}

function sortText(a: string, b: string) {
  return a.localeCompare(b, "es");
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <select
        className="h-10 w-full min-w-40 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-sky-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

function Surface({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/20 ${className}`}>
      {children}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
          {icon}
        </div>
      </div>
    </Surface>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-52 items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; fill?: string; payload?: unknown }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl">
      {label ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p> : null}
      <div className="space-y-2">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-6 text-sm">
            <span className="text-slate-300">{item.name}</span>
            <span className="font-semibold text-white">{formatCurrency(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildOptions(values: Array<string | number>, allLabel: string): Option[] {
  return [
    { label: allLabel, value: ALL_VALUE },
    ...values.map((value) => ({ label: String(value), value: String(value) })),
  ];
}

function getKnownLineas(rows: SalesByExecutiveRow[], selectedNegocio: string) {
  const lineas = new Set<string>();
  for (const row of rows) {
    if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
    if (row.linea) lineas.add(row.linea);
  }
  return [...lineas].sort(sortText);
}

function aggregateExecutives(rows: SalesByExecutiveRow[]): ExecutiveAggregate[] {
  const map = new Map<
    string,
    {
      ventasMonto: number;
      operaciones: number;
      clientes: Set<string>;
      lineas: Set<string>;
      ventasPorLinea: Map<string, number>;
      ventasPorCliente: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const current =
      map.get(row.ejecutivo) ??
      {
        ventasMonto: 0,
        operaciones: 0,
        clientes: new Set<string>(),
        lineas: new Set<string>(),
        ventasPorLinea: new Map<string, number>(),
        ventasPorCliente: new Map<string, number>(),
      };
    const linea = row.linea ?? "Sin linea";
    const cliente = row.cliente ?? "Sin cliente";

    current.ventasMonto += row.ventasMonto;
    current.operaciones += 1;
    current.clientes.add(cliente);
    current.lineas.add(linea);
    current.ventasPorLinea.set(linea, (current.ventasPorLinea.get(linea) ?? 0) + row.ventasMonto);
    current.ventasPorCliente.set(cliente, (current.ventasPorCliente.get(cliente) ?? 0) + row.ventasMonto);
    map.set(row.ejecutivo, current);
  }

  const total = [...map.values()].reduce((sum, item) => sum + item.ventasMonto, 0);

  return [...map.entries()]
    .map(([ejecutivo, data]) => {
      const bestLinea = [...data.ventasPorLinea.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin linea", 0];
      const bestCliente = [...data.ventasPorCliente.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin cliente", 0];

      return {
        ejecutivo,
        ventasMonto: data.ventasMonto,
        operaciones: data.operaciones,
        clientes: data.clientes.size,
        lineas: data.lineas.size,
        ticketPromedio: data.operaciones ? data.ventasMonto / data.operaciones : 0,
        share: total ? (data.ventasMonto / total) * 100 : 0,
        bestLinea: bestLinea[0],
        bestLineaVentas: bestLinea[1],
        bestCliente: bestCliente[0],
        bestClienteVentas: bestCliente[1],
      };
    })
    .filter((row) => row.ventasMonto !== 0)
    .sort((a, b) => b.ventasMonto - a.ventasMonto);
}

export function SalesByExecutiveDashboard({
  summary,
}: {
  summary: SalesByExecutiveSummary;
}) {
  const [selectedYear, setSelectedYear] = useState(ALL_VALUE);
  const [selectedMonth, setSelectedMonth] = useState(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState(ALL_VALUE);

  const lineaOptions = useMemo(
    () => buildOptions(getKnownLineas(summary.rows, selectedNegocio), "Todas las lineas"),
    [selectedNegocio, summary.rows],
  );

  const baseRows = useMemo(
    () =>
      summary.rows.filter((row) => {
        if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
        if (selectedMonth !== ALL_VALUE && row.monthIndex !== Number(selectedMonth)) return false;
        if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
        if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
        return true;
      }),
    [selectedLinea, selectedMonth, selectedNegocio, selectedYear, summary.rows],
  );

  const ejecutivoOptions = useMemo(() => {
    const ejecutivos = new Set<string>();
    for (const row of baseRows) ejecutivos.add(row.ejecutivo);
    return buildOptions([...ejecutivos].sort(sortText), "Todos los ejecutivos");
  }, [baseRows]);

  const filteredRows = useMemo(
    () =>
      selectedEjecutivo === ALL_VALUE
        ? baseRows
        : baseRows.filter((row) => row.ejecutivo === selectedEjecutivo),
    [baseRows, selectedEjecutivo],
  );

  const executiveRanking = useMemo(() => aggregateExecutives(filteredRows), [filteredRows]);
  const totalVentas = executiveRanking.reduce((sum, row) => sum + row.ventasMonto, 0);
  const totalOperaciones = executiveRanking.reduce((sum, row) => sum + row.operaciones, 0);
  const totalClientes = new Set(filteredRows.map((row) => row.cliente).filter(Boolean)).size;
  const ticketPromedio = totalOperaciones ? totalVentas / totalOperaciones : 0;
  const leader = executiveRanking[0] ?? null;
  const activeExecutive = selectedEjecutivo !== ALL_VALUE ? selectedEjecutivo : leader?.ejecutivo ?? null;
  const avgTicket = executiveRanking.length
    ? executiveRanking.reduce((sum, row) => sum + row.ticketPromedio, 0) / executiveRanking.length
    : 0;
  const avgOperations = executiveRanking.length
    ? executiveRanking.reduce((sum, row) => sum + row.operaciones, 0) / executiveRanking.length
    : 0;

  const monthlyRows = useMemo(() => {
    const year =
      selectedYear !== ALL_VALUE
        ? Number(selectedYear)
        : summary.years[0] ?? null;
    if (!year || !activeExecutive) return [];

    const executiveTotals = new Array<number>(12).fill(0);
    const teamTotals = new Map<number, { total: number; executives: Set<string> }>();
    for (let index = 0; index < 12; index += 1) {
      teamTotals.set(index, { total: 0, executives: new Set<string>() });
    }

    for (const row of summary.rows) {
      if (row.importYear !== year || row.monthIndex === null) continue;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;

      if (row.ejecutivo === activeExecutive) {
        executiveTotals[row.monthIndex] += row.ventasMonto;
      }

      const team = teamTotals.get(row.monthIndex);
      if (!team) continue;
      team.total += row.ventasMonto;
      team.executives.add(row.ejecutivo);
    }

    return MONTH_LABELS.map((month, index) => {
      const team = teamTotals.get(index);
      return {
        month,
        [activeExecutive]: executiveTotals[index],
        "Promedio equipo": team?.executives.size ? (team.total / team.executives.size) : 0,
      };
    });
  }, [activeExecutive, selectedLinea, selectedNegocio, selectedYear, summary.rows, summary.years]);

  const yearOptions = buildOptions(summary.years, "Todos los anios");
  const normalizedMonthOptions = [
    { label: "Todos los meses", value: ALL_VALUE },
    ...MONTH_LABELS.map((label, index) => ({ label, value: String(index) })),
  ];
  const negocioOptions = buildOptions(summary.negocios, "Todos los negocios");

  return (
    <div className="min-h-screen bg-[#05080f] p-4 text-slate-300 lg:p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-3xl border border-sky-500/20 bg-[linear-gradient(135deg,#07111f_0%,#0b1f33_48%,#123f5f_100%)] p-7 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">Performance comercial</p>
              <h1 className="mt-3 text-3xl font-bold text-white">Ejecutivos de venta</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Ranking y lectura operativa usando solo ventas facturadas de la tabla imports: monto, operaciones, clientes, lineas y evolucion mensual.
              </p>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-5">
              <FilterSelect label="Anio" value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
              <FilterSelect label="Mes" value={selectedMonth} options={normalizedMonthOptions} onChange={setSelectedMonth} />
              <FilterSelect
                label="Negocio"
                value={selectedNegocio}
                options={negocioOptions}
                onChange={(value) => {
                  setSelectedNegocio(value);
                  setSelectedLinea(ALL_VALUE);
                }}
              />
              <FilterSelect label="Linea" value={selectedLinea} options={lineaOptions} onChange={setSelectedLinea} />
              <FilterSelect label="Ejecutivo" value={selectedEjecutivo} options={ejecutivoOptions} onChange={setSelectedEjecutivo} />
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard title="Venta facturada" value={formatCurrency(totalVentas)} subtitle={`${formatNumber(totalOperaciones)} operaciones facturadas`} icon={<CircleDollarSign className="size-5" />} />
          <KpiCard title="Ticket promedio" value={formatCurrency(ticketPromedio)} subtitle="Venta promedio por fila facturada" icon={<Target className="size-5" />} />
          <KpiCard title="Clientes atendidos" value={formatNumber(totalClientes)} subtitle="Clientes unicos visibles" icon={<UsersRound className="size-5" />} />
          <KpiCard title="Lider visible" value={leader?.ejecutivo ?? "-"} subtitle={leader ? `${formatPercent(leader.share)} del total filtrado` : "Sin ventas visibles"} icon={<Trophy className="size-5" />} />
        </section>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-1.5">
            <TabsTrigger value="ranking" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <BarChart3 className="size-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="matriz" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <Crosshair className="size-4" />
              Matriz
            </TabsTrigger>
            <TabsTrigger value="mensual" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <Target className="size-4" />
              Mensual
            </TabsTrigger>
            <TabsTrigger value="detalle" className="gap-2 rounded-xl px-4 py-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white">
              <ListOrdered className="size-4" />
              Detalle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="m-0">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
              <Surface className="p-6">
                <h2 className="text-xl font-semibold text-white">Ranking por venta facturada</h2>
                <p className="mt-1 text-sm text-slate-500">Top ejecutivos por monto total en los filtros actuales.</p>
                <div className="mt-6 h-[440px]">
                  {executiveRanking.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={executiveRanking.slice(0, 12)} layout="vertical" margin={{ left: 30, right: 24 }}>
                        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(Number(value))} stroke="#64748b" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="ejecutivo" width={150} stroke="#94a3b8" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="ventasMonto" name="Venta facturada" radius={[0, 8, 8, 0]}>
                          {executiveRanking.slice(0, 12).map((entry, index) => (
                            <Cell key={entry.ejecutivo} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState>No hay ventas facturadas para los filtros seleccionados.</EmptyState>
                  )}
                </div>
              </Surface>

              <Surface className="p-6">
                <h2 className="text-xl font-semibold text-white">Podio</h2>
                <p className="mt-1 text-sm text-slate-500">Lideres visibles y su foco comercial.</p>
                <div className="mt-5 space-y-4">
                  {executiveRanking.slice(0, 3).map((row, index) => (
                    <div key={row.ejecutivo} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{row.ejecutivo}</p>
                          <p className="mt-1 text-2xl font-bold text-sky-300">{formatCompactCurrency(row.ventasMonto)}</p>
                        </div>
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-300">#{index + 1}</span>
                      </div>
                      <div className="mt-4 space-y-1 text-xs text-slate-400">
                        <p>Linea fuerte: <span className="text-slate-200">{row.bestLinea}</span></p>
                        <p>Cliente principal: <span className="text-slate-200">{row.bestCliente}</span></p>
                        <p>Share visible: <span className="font-medium text-emerald-400">{formatPercent(row.share)}</span></p>
                      </div>
                    </div>
                  ))}
                  {!executiveRanking.length ? <EmptyState>Sin podio para los filtros actuales.</EmptyState> : null}
                </div>
              </Surface>
            </div>
          </TabsContent>

          <TabsContent value="matriz" className="m-0">
            <Surface className="p-6">
              <h2 className="text-xl font-semibold text-white">Matriz de valor operativo</h2>
              <p className="mt-1 text-sm text-slate-500">X: operaciones facturadas. Y: ticket promedio. Tamano: venta total.</p>
              <div className="mt-6 h-[500px]">
                {executiveRanking.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 28, bottom: 30, left: 20 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="operaciones" name="Operaciones" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis type="number" dataKey="ticketPromedio" name="Ticket promedio" tickFormatter={(value) => formatCompactCurrency(Number(value))} stroke="#64748b" tickLine={false} axisLine={false} />
                      <ZAxis type="number" dataKey="ventasMonto" range={[100, 1300]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3", stroke: "#475569" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload as ExecutiveAggregate;
                          return (
                            <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
                              <p className="font-semibold text-sky-300">{data.ejecutivo}</p>
                              <div className="mt-2 space-y-1 text-xs text-slate-400">
                                <p>Ventas: <span className="text-white">{formatCurrency(data.ventasMonto)}</span></p>
                                <p>Operaciones: <span className="text-white">{formatNumber(data.operaciones)}</span></p>
                                <p>Ticket: <span className="text-white">{formatCurrency(data.ticketPromedio)}</span></p>
                                <p>Clientes: <span className="text-white">{formatNumber(data.clientes)}</span></p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Scatter data={executiveRanking} name="Ejecutivos">
                        {executiveRanking.map((row) => (
                          <Cell
                            key={row.ejecutivo}
                            fill={row.ticketPromedio >= avgTicket && row.operaciones >= avgOperations ? "#22c55e" : "#38bdf8"}
                            fillOpacity={0.78}
                            stroke="#0f172a"
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState>No hay datos suficientes para la matriz.</EmptyState>
                )}
              </div>
            </Surface>
          </TabsContent>

          <TabsContent value="mensual" className="m-0">
            <Surface className="p-6">
              <h2 className="text-xl font-semibold text-white">
                Evolucion mensual {activeExecutive ? `de ${activeExecutive}` : ""}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Compara al ejecutivo lider o seleccionado contra el promedio mensual del equipo.
              </p>
              <div className="mt-6 h-[440px]">
                {activeExecutive && monthlyRows.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyRows} margin={{ right: 20 }}>
                      <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => formatCompactCurrency(Number(value))} stroke="#64748b" tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Bar dataKey={activeExecutive} name={activeExecutive} fill="#38bdf8" radius={[8, 8, 0, 0]} />
                      <Line type="monotone" dataKey="Promedio equipo" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState>Selecciona un anio con ventas para ver evolucion mensual.</EmptyState>
                )}
              </div>
            </Surface>
          </TabsContent>

          <TabsContent value="detalle" className="m-0">
            <Surface className="overflow-hidden">
              <div className="border-b border-slate-800 px-6 py-5">
                <h2 className="text-xl font-semibold text-white">Resumen por ejecutivo</h2>
                <p className="mt-1 text-sm text-slate-500">Detalle agregado desde filas facturadas de imports.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-6 py-4">#</th>
                      <th className="px-6 py-4">Ejecutivo</th>
                      <th className="px-6 py-4 text-right">Venta</th>
                      <th className="px-6 py-4 text-right">Share</th>
                      <th className="px-6 py-4 text-right">Operaciones</th>
                      <th className="px-6 py-4 text-right">Clientes</th>
                      <th className="px-6 py-4 text-right">Ticket</th>
                      <th className="px-6 py-4 text-right">Linea fuerte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {executiveRanking.length ? (
                      executiveRanking.map((row, index) => (
                        <tr key={row.ejecutivo} className="hover:bg-white/5">
                          <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4 font-medium text-white">{row.ejecutivo}</td>
                          <td className="px-6 py-4 text-right font-semibold text-sky-300">{formatCurrency(row.ventasMonto)}</td>
                          <td className="px-6 py-4 text-right text-emerald-300">{formatPercent(row.share)}</td>
                          <td className="px-6 py-4 text-right text-slate-300">{formatNumber(row.operaciones)}</td>
                          <td className="px-6 py-4 text-right text-slate-300">{formatNumber(row.clientes)}</td>
                          <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(row.ticketPromedio)}</td>
                          <td className="px-6 py-4 text-right text-slate-400">
                            {row.bestLinea} <span className="text-slate-600">({formatCompactCurrency(row.bestLineaVentas)})</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                          No hay ejecutivos para mostrar con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Surface>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
