"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Line,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  ResponsiveContainer,
  Label as RechartsLabel,
} from "recharts";
import { 
  UsersRound, 
  Trophy, 
  Target, 
  TrendingUp, 
  LayoutDashboard, 
  Crosshair,
  ListOrdered
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label as UiLabel } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SalesByExecutiveSummary } from "@/modules/dashboard/services/sales-by-executive";

const ALL_VALUE = "__all__";
const CHART_COLORS = [
  "#38bdf8", "#0ea5e9", "#0284c7", "#22d3ee", 
  "#06b6d4", "#67e8f9", "#7dd3fc", "#bae6fd",
] as const;

const CHART_TICK_STYLE = { fill: "#94a3b8", fontSize: 11 } as const;
const CHART_AXIS_STYLE = { stroke: "#1e293b" } as const;
const EXECUTIVE_MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// --- Utilidades de Formato Locales ---
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}
function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}
function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

// --- Componentes UI Integrados ---
function FilterSelect({ label, value, options, onChange, disabled = false }: any) {
  return (
    <div className="space-y-1">
      <UiLabel className="text-[10px] uppercase text-white/50">{label}</UiLabel>
      <select
        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 ring-sky-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value} className="bg-[#1e293b]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const KpiCard = ({ title, value, icon: Icon, tone, description, valueFormatter }: any) => {
  const displayValue = valueFormatter ? valueFormatter(value) : value;
  const toneColors: any = {
    primary: "text-sky-400",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-rose-400",
    default: "text-slate-100"
  };
  const colorClass = toneColors[tone] || toneColors.default;

  return (
    <Card className="bg-slate-900 border-slate-800 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${colorClass}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{displayValue}</div>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};

type ExecutiveAggregate = {
  ejecutivo: string;
  ventasMonto: number;
  operaciones: number;
  ticketPromedio: number;
  salesShare: number;
  bestLinea: string;
  bestLineaVentas: number;
};

// --- Datos Mock ---
const mockSummary: SalesByExecutiveSummary = {
  years: [2023, 2024],
  negocios: ["B2B", "B2C"],
  lineas: ["Equipos", "Servicios", "Consultoría"],
  ejecutivos: ["Carlos Ruiz", "Ana Gómez", "Luis Paz"],
  rows: [
    { importYear: 2024, monthIndex: 0, negocio: "B2B", linea: "Equipos", ejecutivo: "Carlos Ruiz", ventasMonto: 150000, operaciones: 10 },
    { importYear: 2024, monthIndex: 1, negocio: "B2B", linea: "Equipos", ejecutivo: "Carlos Ruiz", ventasMonto: 120000, operaciones: 8 },
    { importYear: 2024, monthIndex: 0, negocio: "B2C", linea: "Servicios", ejecutivo: "Ana Gómez", ventasMonto: 90000, operaciones: 45 },
    { importYear: 2024, monthIndex: 1, negocio: "B2C", linea: "Servicios", ejecutivo: "Ana Gómez", ventasMonto: 110000, operaciones: 55 },
    { importYear: 2024, monthIndex: 2, negocio: "B2B", linea: "Consultoría", ejecutivo: "Luis Paz", ventasMonto: 300000, operaciones: 3 },
    { importYear: 2024, monthIndex: 2, negocio: "B2C", linea: "Equipos", ejecutivo: "Ana Gómez", ventasMonto: 40000, operaciones: 12 },
  ] as any[]
};

export  function SalesByExecutiveDashboard({
  summary = mockSummary,
}: {
  summary?: SalesByExecutiveSummary;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>(ALL_VALUE);
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<string>(String(summary.years[summary.years.length - 1] || ALL_VALUE));

  const availableLineas = useMemo(() => {
    if (selectedNegocio === ALL_VALUE) return [];
    const lineas = new Set<string>();
    for (const row of summary.rows) {
      if (row.negocio === selectedNegocio && row.linea) lineas.add(row.linea);
    }
    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedNegocio, summary.rows]);

  const rowsMatchingBaseFilters = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
      if (selectedMonth !== ALL_VALUE && row.monthIndex !== Number(selectedMonth)) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      return true;
    });
  }, [selectedLinea, selectedMonth, selectedNegocio, selectedYear, summary.rows]);

  const filteredRows = useMemo(() => {
    return rowsMatchingBaseFilters.filter((row) => {
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
      return true;
    });
  }, [rowsMatchingBaseFilters, selectedEjecutivo]);

  // --- Analítica Principal por Ejecutivo ---
  const executiveRanking = useMemo(() => {
    const executiveMap = new Map<string, { totalVentas: number; operaciones: number; lineas: Map<string, number> }>();
    
    for (const row of filteredRows) {
      const current = executiveMap.get(row.ejecutivo) ?? { totalVentas: 0, operaciones: 0, lineas: new Map() };
      current.totalVentas += row.ventasMonto;
      if (row.ventasMonto > 0) current.operaciones += 1;

      const linea = row.linea ?? "Sin línea";
      current.lineas.set(linea, (current.lineas.get(linea) ?? 0) + row.ventasMonto);
      executiveMap.set(row.ejecutivo, current);
    }

    const sorted = [...executiveMap.entries()]
      .filter(([, data]) => data.totalVentas !== 0)
      .sort((a, b) => b[1].totalVentas - a[1].totalVentas);
    const globalSales = sorted.reduce((sum, r) => sum + r[1].totalVentas, 0);

    return sorted.map(([ejecutivo, data]) => {
      const bestLineaEntry = [...data.lineas.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin línea", 0];
      return {
        ejecutivo,
        ventasMonto: data.totalVentas,
        operaciones: data.operaciones,
        ticketPromedio: data.operaciones > 0 ? data.totalVentas / data.operaciones : 0,
        salesShare: globalSales ? (data.totalVentas / globalSales) * 100 : 0,
        bestLinea: bestLineaEntry[0],
        bestLineaVentas: bestLineaEntry[1],
      } satisfies ExecutiveAggregate;
    });
  }, [filteredRows]);

  // Insights Globales
  const totalVentas = executiveRanking.reduce((sum, r) => sum + r.ventasMonto, 0);
  const totalOperaciones = executiveRanking.reduce((sum, r) => sum + r.operaciones, 0);
  const avgGlobalTicket = totalOperaciones > 0 ? totalVentas / totalOperaciones : 0;
  const bestExecutive = executiveRanking[0];

  // --- Lógica para Benchmarking Mensual (Ejecutivo Seleccionado vs Promedio) ---
  const activeExecutive = selectedEjecutivo !== ALL_VALUE ? selectedEjecutivo : executiveRanking[0]?.ejecutivo ?? null;
  const activeExecutiveRows = useMemo(() => summary.rows.filter((row) => row.ejecutivo === activeExecutive), [activeExecutive, summary.rows]);
  
  const monthlyComparisonYears = useMemo(() => {
    const years = new Set<number>();
    for (const row of activeExecutiveRows) if (row.importYear) years.add(row.importYear);
    return [...years].sort((a, b) => a - b);
  }, [activeExecutiveRows]);

  const visibleMonthlyYear = selectedMonthlyYear !== ALL_VALUE ? Number(selectedMonthlyYear) : monthlyComparisonYears[monthlyComparisonYears.length - 1];

  const monthlyBenchmarking = useMemo(() => {
    if (!visibleMonthlyYear) return [];
    
    // Ventas del ejecutivo activo en el año seleccionado
    const execSales = new Array(12).fill(0);
    for (const row of activeExecutiveRows) {
      if (row.importYear === visibleMonthlyYear && row.monthIndex !== null) {
        execSales[row.monthIndex] += row.ventasMonto;
      }
    }

    // Ventas promedio del resto del equipo en ese mismo año
    const allExecsSales = new Map<number, { total: number, count: Set<string> }>();
    for (let i = 0; i < 12; i++) allExecsSales.set(i, { total: 0, count: new Set() });

    for (const row of summary.rows) {
      if (row.importYear === visibleMonthlyYear && row.monthIndex !== null) {
        const monthData = allExecsSales.get(row.monthIndex)!;
        monthData.total += row.ventasMonto;
        monthData.count.add(row.ejecutivo);
      }
    }

    return EXECUTIVE_MONTH_LABELS.map((month, index) => {
      const monthData = allExecsSales.get(index)!;
      const avgSales = monthData.count.size > 0 ? monthData.total / monthData.count.size : 0;
      return {
        month,
        [activeExecutive ?? "Ejecutivo"]: execSales[index],
        "Promedio Equipo": avgSales
      };
    });
  }, [activeExecutive, activeExecutiveRows, summary.rows, visibleMonthlyYear]);

  // --- Filtros ---
  const yearOptions = useMemo(() => [{ label: "Todos los años", value: ALL_VALUE }, ...summary.years.map((y) => ({ label: String(y), value: String(y) }))], [summary.years]);
  const monthOptions = useMemo(() => [{ label: "Todos los meses", value: ALL_VALUE }, ...EXECUTIVE_MONTH_LABELS.map((m, i) => ({ label: m, value: String(i) }))], []);
  const negocioOptions = useMemo(() => [{ label: "Todos los negocios", value: ALL_VALUE }, ...summary.negocios.map((n) => ({ label: n, value: n }))], [summary.negocios]);
  const lineaOptions = useMemo(() => [{ label: "Todas las líneas", value: ALL_VALUE }, ...availableLineas.map((l) => ({ label: l, value: l }))], [availableLineas]);
  const ejecutivoOptions = useMemo(() => {
    const execs = new Set<string>();
    for (const row of rowsMatchingBaseFilters) execs.add(row.ejecutivo);
    return [{ label: "Todos los ejecutivos", value: ALL_VALUE }, ...[...execs].sort((a,b)=>a.localeCompare(b)).map(e => ({ label: e, value: e }))];
  }, [rowsMatchingBaseFilters]);
  const monthlyYearOptions = useMemo(() => monthlyComparisonYears.map((y) => ({ label: String(y), value: String(y) })), [monthlyComparisonYears]);

  return (
    <div className="space-y-6 p-2 lg:p-4 bg-[#020617] min-h-screen text-slate-100">
      
      {/* HEADER ESTRATÉGICO */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0b1f33] to-[#17456d] p-8 shadow-2xl border border-sky-900/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_40%)]" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-400 font-semibold mb-2">
              Capital Humano & Comercial
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Rendimiento por Ejecutivo
            </h1>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              Mide la eficiencia de la fuerza de ventas cruzando el volumen de operaciones contra el ticket promedio y comparando la evolución mensual contra el estándar del equipo.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 w-full lg:w-auto bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/5 shadow-inner">
            <FilterSelect label="Año" value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
            <FilterSelect label="Mes" value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />
            <FilterSelect label="Negocio" value={selectedNegocio} options={negocioOptions} onChange={(v: string) => { setSelectedNegocio(v); setSelectedLinea(ALL_VALUE); }} />
            <FilterSelect label="Línea" value={selectedLinea} options={lineaOptions} onChange={setSelectedLinea} disabled={selectedNegocio === ALL_VALUE} />
            <FilterSelect label="Ejecutivo" value={selectedEjecutivo} options={ejecutivoOptions} onChange={setSelectedEjecutivo} className="col-span-2 md:col-span-1 xl:col-span-1" />
          </div>
        </div>
      </header>

      {/* KPI SECTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Total Facturado" 
          value={totalVentas} 
          icon={TrendingUp} 
          tone="primary" 
          valueFormatter={formatCurrency}
        />
        <KpiCard 
          title="Ticket Promedio Global" 
          value={avgGlobalTicket} 
          icon={Target} 
          tone="success" 
          valueFormatter={formatCurrency}
          description={`${totalOperaciones} cierres exitosos`}
        />
        <KpiCard 
          title="Fuerza de Ventas Activa" 
          value={executiveRanking.length} 
          icon={UsersRound} 
          tone="warning" 
          format="number"
          description="Ejecutivos con ventas en el periodo"
        />
        <KpiCard 
          title="Top Performer" 
          value={bestExecutive?.ejecutivo ?? "-"} 
          icon={Trophy} 
          tone="default" 
          description={bestExecutive ? `${formatPercent(bestExecutive.salesShare)} del Share` : "Sin datos"}
        />
      </section>

      {/* TABS DE NAVEGACIÓN */}
      <Tabs defaultValue="liderazgo" className="w-full space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl h-auto flex flex-wrap gap-2">
          <TabsTrigger value="liderazgo" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <LayoutDashboard size={18} /> Ranking & Liderazgo
          </TabsTrigger>
          <TabsTrigger value="rendimiento" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <Crosshair size={18} /> Matriz de Rendimiento
          </TabsTrigger>
          <TabsTrigger value="benchmarking" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <TrendingUp size={18} /> Benchmarking Mensual
          </TabsTrigger>
          <TabsTrigger value="detalle" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <ListOrdered size={18} /> Tabla Resumen
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: RANKING Y LIDERAZGO */}
        <TabsContent value="liderazgo" className="m-0">
          <section className="grid gap-6 xl:grid-cols-[1fr_300px]">
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader>
                <CardTitle>Leaderboard: Top Ejecutivos</CardTitle>
                <p className="text-sm text-slate-400">Clasificación por volumen monetario de ventas.</p>
              </CardHeader>
              <CardContent className="h-[430px]">
                {executiveRanking.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={executiveRanking.slice(0, 10)} layout="vertical" margin={{ left: 24, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                      <XAxis type="number" tickFormatter={(v) => formatCurrencyCompact(v)} tick={CHART_TICK_STYLE} axisLine={CHART_AXIS_STYLE} tickLine={CHART_AXIS_STYLE} />
                      <YAxis type="category" dataKey="ejecutivo" width={140} tick={CHART_TICK_STYLE} axisLine={CHART_AXIS_STYLE} tickLine={CHART_AXIS_STYLE} />
                      <Tooltip
                        cursor={{ fill: "rgba(56, 189, 248, 0.05)" }}
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#fff" }}
                        formatter={(v: any) => formatCurrency(Number(v))}
                      />
                      <Bar dataKey="ventasMonto" radius={[0, 6, 6, 0]} barSize={20}>
                        {executiveRanking.slice(0, 10).map((entry, index) => (
                          <Cell key={entry.ejecutivo} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center border border-dashed border-slate-700 rounded-xl text-sm text-slate-500">
                    No hay datos para los filtros seleccionados.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 shadow-xl flex flex-col">
              <CardHeader>
                <CardTitle>Podio Comercial (Top 3)</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                {executiveRanking.slice(0, 3).map((card, index) => (
                  <div key={card.ejecutivo} className="rounded-xl border border-slate-800 bg-slate-950 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-sky-500/20 text-sky-400 p-2 text-xs font-bold rounded-bl-xl border-l border-b border-sky-500/30">
                      #{index + 1}
                    </div>
                    <p className="text-sm font-semibold text-white">{card.ejecutivo}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-sky-400">
                      {formatCurrencyCompact(card.ventasMonto)}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-slate-400">Línea Fuerte: <span className="text-slate-200">{card.bestLinea}</span></p>
                      <p className="text-xs text-slate-400">Operaciones: <span className="text-slate-200">{card.operaciones}</span></p>
                      <p className="text-xs text-slate-400">Market Share: <span className="text-emerald-400 font-medium">{formatPercent(card.salesShare)}</span></p>
                    </div>
                  </div>
                ))}
                {!executiveRanking.length && (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-700 rounded-xl p-6 text-sm text-slate-500 text-center">
                    Ajusta los filtros para encontrar ejecutivos.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* PESTAÑA 2: MATRIZ DE RENDIMIENTO */}
        <TabsContent value="rendimiento" className="m-0">
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle>Matriz de Rendimiento: Volumen vs Valor</CardTitle>
              <p className="text-sm text-slate-400">Cruza el Ticket Promedio (Y) con la Cantidad de Cierres (X). Los mejores ejecutivos se ubican en el cuadrante superior derecho.</p>
            </CardHeader>
            <CardContent className="h-[500px]">
              {executiveRanking.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" dataKey="operaciones" name="Cierres" stroke="#94a3b8" tick={{fontSize: 12}}>
                      <RechartsLabel value="Volumen (N° de Cierres/Operaciones)" offset={-10} position="insideBottom" fill="#94a3b8" />
                    </XAxis>
                    <YAxis type="number" dataKey="ticketPromedio" name="Ticket Prom." tickFormatter={(v) => formatCurrencyCompact(v)} stroke="#94a3b8" tick={{fontSize: 12}}>
                      <RechartsLabel value="Ticket Promedio (PEN)" angle={-90} position="insideLeft" fill="#94a3b8" />
                    </YAxis>
                    <ZAxis type="number" dataKey="ventasMonto" range={[100, 1500]} name="Ventas Totales" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3', stroke: '#334155' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as ExecutiveAggregate;
                          return (
                            <div className="bg-slate-900 p-4 border border-slate-700 rounded-xl shadow-2xl">
                              <p className="font-bold text-sky-400 mb-2">{data.ejecutivo}</p>
                              <div className="space-y-1">
                                <p className="text-xs text-slate-400">Cierres: <span className="font-medium text-white">{data.operaciones}</span></p>
                                <p className="text-xs text-slate-400">Ticket Prom.: <span className="font-medium text-white">{formatCurrency(data.ticketPromedio)}</span></p>
                                <p className="text-xs text-slate-400">Total Ventas: <span className="font-medium text-emerald-400">{formatCurrency(data.ventasMonto)}</span></p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={avgGlobalTicket} stroke="#facc15" strokeDasharray="5 5" label={{ value: 'Promedio Ticket', fill: '#facc15', fontSize: 11, position: 'insideTopLeft' }} />
                    <Scatter name="Ejecutivos" data={executiveRanking} fill="#38bdf8">
                      {executiveRanking.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.ticketPromedio >= avgGlobalTicket ? "#10b981" : "#0ea5e9"} opacity={0.8} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center border border-dashed border-slate-700 rounded-xl text-sm text-slate-500">
                  No hay datos suficientes para la matriz.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 3: BENCHMARKING MENSUAL */}
        <TabsContent value="benchmarking" className="m-0">
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Benchmarking: {activeExecutive ?? "Ejecutivo"} vs Equipo</CardTitle>
                <p className="text-sm text-slate-400">Compara las ventas del ejecutivo seleccionado contra el promedio del resto del equipo en el mismo mes.</p>
              </div>
              <div className="w-full lg:w-56">
                <FilterSelect
                  label="Año de Análisis"
                  value={selectedMonthlyYear}
                  options={monthlyYearOptions}
                  onChange={setSelectedMonthlyYear}
                  disabled={!monthlyComparisonYears.length}
                />
              </div>
            </CardHeader>
            <CardContent className="h-[430px]">
              {activeExecutive && activeExecutiveRows.length && visibleMonthlyYear ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyBenchmarking} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => formatCurrencyCompact(v)} stroke="#94a3b8" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#fff" }}
                      formatter={(v: any) => formatCurrency(Number(v))}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey={activeExecutive} fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Line type="monotone" dataKey="Promedio Equipo" stroke="#facc15" strokeWidth={3} dot={{ r: 4, fill: "#facc15", stroke: "#0f172a", strokeWidth: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center border border-dashed border-slate-700 rounded-xl text-sm text-slate-500">
                  Selecciona un ejecutivo y asegúrate de que tenga datos en el año seleccionado.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 4: DETALLE TABULAR */}
        <TabsContent value="detalle" className="m-0">
          <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">#</th>
                    <th className="px-6 py-4 font-semibold">Ejecutivo</th>
                    <th className="px-6 py-4 font-semibold text-right">Ventas Totales</th>
                    <th className="px-6 py-4 font-semibold text-right">Market Share</th>
                    <th className="px-6 py-4 font-semibold text-right">N° Operaciones</th>
                    <th className="px-6 py-4 font-semibold text-right">Ticket Promedio</th>
                    <th className="px-6 py-4 font-semibold text-right">Línea Destacada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {executiveRanking.length ? (
                    executiveRanking.map((row, index) => {
                      const isTop3 = index < 3;
                      const hasHighTicket = row.ticketPromedio > avgGlobalTicket;

                      return (
                        <tr key={row.ejecutivo} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              {row.ejecutivo}
                              {isTop3 && <Trophy size={14} className="text-amber-400" />}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums font-bold text-sky-400">
                            {formatCurrency(row.ventasMonto)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-300">
                            {formatPercent(row.salesShare)}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-slate-400">
                            {row.operaciones}
                          </td>
                          <td className={`px-6 py-4 text-right tabular-nums ${hasHighTicket ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                            {formatCurrency(row.ticketPromedio)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400">
                            {row.bestLinea} <span className="text-[10px] text-slate-500">({formatCurrencyCompact(row.bestLineaVentas)})</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No hay ejecutivos para mostrar con los filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
