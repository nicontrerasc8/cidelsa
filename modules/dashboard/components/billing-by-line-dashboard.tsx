"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Label as RechartsLabel,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  LayoutDashboard,
  Lightbulb,
  ListOrdered,
  PieChart as PieChartIcon,
  ReceiptText,
  Rocket,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { BillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";

const ALL_VALUE = "__all__";
const CHART_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#d946ef", "#84cc16"] as const;
const CHART_AXIS_STYLE = { stroke: "rgba(255,255,255,0.1)", fontSize: 11 } as const;
const CHART_TICK_STYLE = { fill: "rgba(255,255,255,0.5)", fontSize: 11 } as const;

type BillingAggregate = {
  linea: string;
  ventasMonto: number;
  operaciones: number;
  ticketPromedio: number;
  salesShare: number;
  cumulativeShare: number;
  prevVentasMonto: number;
  yoyGrowth: number | null;
};

type Insight = { type: "warning" | "success" | "info"; text: string };
type TooltipPayload = { name?: string; value?: unknown; color?: string; fill?: string; dataKey?: string; payload?: Partial<BillingAggregate> };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function ShellCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur-xl ${className}`}>{children}</div>;
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

function TabButton({ active, onClick, children, icon: Icon }: { active: boolean; onClick: () => void; children: ReactNode; icon: LucideIcon }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${active ? "border-sky-400/50 bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"}`}><Icon size={18} />{children}</button>;
}

function EmptyState({ msg = "No hay datos para los filtros seleccionados." }: { msg?: string }) {
  return <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/20 p-8 text-center text-slate-500"><AlertCircle className="mb-3 h-10 w-10 text-slate-600" /><p>{msg}</p></div>;
}
function KpiCard({ title, value, subtitle, icon: Icon, trend, color }: { title: string; value: string; subtitle?: string; icon: LucideIcon; trend?: number | null; color: "sky" | "indigo" | "emerald" | "amber" | "rose" | "slate" }) {
  const colorMap = {
    sky: "from-sky-500/20 text-sky-400",
    indigo: "from-indigo-500/20 text-indigo-400",
    emerald: "from-emerald-500/20 text-emerald-400",
    amber: "from-amber-500/20 text-amber-400",
    rose: "from-rose-500/20 text-rose-400",
    slate: "from-slate-500/20 text-slate-400",
  }[color];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 shadow-2xl backdrop-blur-md transition-all hover:bg-slate-800/80">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-30 to-transparent ${colorMap}`} />
      <div className="relative z-10 mb-4 flex items-start justify-between">
        <div className="rounded-xl border border-white/5 bg-black/40 p-2.5 shadow-inner transition-transform group-hover:scale-110"><Icon className="h-5 w-5" /></div>
        {trend !== undefined && trend !== null ? <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${trend >= 0 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}>{trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(trend).toFixed(1)}% YoY</div> : null}
      </div>
      <div className="relative z-10"><h4 className="mb-1 text-sm font-medium text-slate-400">{title}</h4><span className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{value}</span>{subtitle ? <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p> : null}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, format = "currency", dataKey = "ventasMonto", name = "Valor" }: { active?: boolean; payload?: TooltipPayload[]; label?: string; format?: "currency" | "percent" | "pareto"; dataKey?: keyof BillingAggregate; name?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[200px] rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <p className="mb-3 border-b border-white/10 pb-2 font-bold text-white">{label || payload[0]?.payload?.linea}</p>
      {payload.map((item, index) => {
        const payloadValue = item.payload?.[item.dataKey as keyof BillingAggregate] ?? item.payload?.[dataKey] ?? item.value;
        const numericValue = typeof payloadValue === "number" ? payloadValue : Number(payloadValue ?? 0);
        const formattedValue = format === "percent" ? formatPercent(numericValue) : formatCurrency(numericValue);
        return <div key={`${item.name ?? index}`} className="my-1.5 flex items-center justify-between gap-4 text-sm"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color ?? item.fill ?? CHART_COLORS[index % CHART_COLORS.length] }} /><span className="text-slate-400">{item.name || name}:</span></div><span className="font-bold text-white">{formattedValue}</span></div>;
      })}
    </div>
  );
}

function MatrixTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: BillingAggregate }> }) {
  const data = payload?.[0]?.payload;
  if (!active || !data) return null;
  return (
    <div className="min-w-[220px] rounded-xl border border-slate-700 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
      <p className="mb-3 border-b border-white/10 pb-2 text-lg font-extrabold text-sky-400">{data.linea}</p>
      <div className="space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-400">Volumen:</span><span className="font-bold text-white">{data.operaciones}</span></div><div className="flex justify-between text-sm"><span className="text-slate-400">Ticket promedio:</span><span className="font-bold text-indigo-400">{formatCurrency(data.ticketPromedio)}</span></div><div className="flex justify-between border-t border-white/5 pt-2 text-sm"><span className="text-slate-400">Ventas:</span><span className="font-bold text-emerald-400">{formatCurrency(data.ventasMonto)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-400">YoY:</span><span className={`font-bold ${data.yoyGrowth === null ? "text-slate-500" : data.yoyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{data.yoyGrowth !== null ? `${data.yoyGrowth > 0 ? "+" : ""}${formatPercent(data.yoyGrowth)}` : "N/A"}</span></div></div>
    </div>
  );
}

function aggregateRows(rows: BillingByLineSummary["rows"]) {
  const map = new Map<string, { linea: string; ventasMonto: number; operaciones: number }>();
  for (const row of rows) {
    const current = map.get(row.linea) ?? { linea: row.linea, ventasMonto: 0, operaciones: 0 };
    current.ventasMonto += row.ventasMonto;
    if (row.ventasMonto > 0) current.operaciones += 1;
    map.set(row.linea, current);
  }
  return map;
}
export function BillingByLineDashboard({ summary }: { summary: BillingByLineSummary }) {
  const [selectedYear, setSelectedYear] = useState<string>(String(summary.years[0] ?? ALL_VALUE));
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [activeTab, setActiveTab] = useState<"resumen" | "pareto" | "eficiencia" | "detalle">("resumen");

  const filteredRows = useMemo(() => summary.rows.filter((row) => {
    if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
    if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
    return true;
  }), [selectedNegocio, selectedYear, summary.rows]);

  const previousYearRows = useMemo(() => {
    if (selectedYear === ALL_VALUE) return [];
    const previousYear = Number(selectedYear) - 1;
    return summary.rows.filter((row) => row.importYear === previousYear && (selectedNegocio === ALL_VALUE || row.negocio === selectedNegocio));
  }, [selectedNegocio, selectedYear, summary.rows]);

  const analytics = useMemo(() => {
    const aggregates = aggregateRows(filteredRows);
    const previousAggregates = aggregateRows(previousYearRows);
    const sorted = [...aggregates.values()].filter((row) => row.ventasMonto !== 0).sort((a, b) => b.ventasMonto - a.ventasMonto);
    const totalFacturado = sorted.reduce((sum, row) => sum + row.ventasMonto, 0);
    const totalOperaciones = sorted.reduce((sum, row) => sum + row.operaciones, 0);
    const totalPrevFacturado = [...previousAggregates.values()].reduce((sum, row) => sum + row.ventasMonto, 0);
    const billingByLine: BillingAggregate[] = sorted.map((row, index) => {
      const previous = previousAggregates.get(row.linea)?.ventasMonto ?? 0;
      const salesShare = totalFacturado ? (row.ventasMonto / totalFacturado) * 100 : 0;
      const cumulativeShare = totalFacturado
        ? sorted.slice(0, index + 1).reduce((sum, item) => sum + (item.ventasMonto / totalFacturado) * 100, 0)
        : 0;
      return { ...row, ticketPromedio: row.operaciones > 0 ? row.ventasMonto / row.operaciones : 0, salesShare, cumulativeShare, prevVentasMonto: previous, yoyGrowth: previous > 0 ? ((row.ventasMonto - previous) / Math.abs(previous)) * 100 : null };
    });

    const avgGlobalTicket = totalOperaciones > 0 ? totalFacturado / totalOperaciones : 0;
    const avgGlobalOps = billingByLine.length > 0 ? totalOperaciones / billingByLine.length : 0;
    const globalGrowth = totalPrevFacturado > 0 ? ((totalFacturado - totalPrevFacturado) / Math.abs(totalPrevFacturado)) * 100 : null;
    const quadrants = { lideres: [] as string[], nichos: [] as string[], transaccionales: [] as string[], rezagados: [] as string[] };

    for (const row of billingByLine) {
      const highTicket = row.ticketPromedio >= avgGlobalTicket;
      const highVolume = row.operaciones >= avgGlobalOps;
      if (highTicket && highVolume) quadrants.lideres.push(row.linea);
      else if (highTicket) quadrants.nichos.push(row.linea);
      else if (highVolume) quadrants.transaccionales.push(row.linea);
      else quadrants.rezagados.push(row.linea);
    }

    const top3Concentration = billingByLine.slice(0, 3).reduce((sum, row) => sum + row.salesShare, 0);
    const topGrowthLine = [...billingByLine].filter((row) => row.yoyGrowth !== null).sort((a, b) => (b.yoyGrowth ?? 0) - (a.yoyGrowth ?? 0))[0];
    const topTicketLine = [...billingByLine].sort((a, b) => b.ticketPromedio - a.ticketPromedio)[0];
    const insights: Insight[] = [];

    if (top3Concentration > 70) insights.push({ type: "warning", text: `Alta dependencia: el top 3 de lineas concentra el ${formatPercent(top3Concentration)} de los ingresos.` });
    else if (top3Concentration < 40) insights.push({ type: "success", text: `Portafolio sano: el top 3 solo concentra el ${formatPercent(top3Concentration)} del ingreso total.` });
    else insights.push({ type: "info", text: `Concentracion moderada: el top 3 representa el ${formatPercent(top3Concentration)} del ingreso total.` });

    if (topGrowthLine && topGrowthLine.yoyGrowth !== null && topGrowthLine.yoyGrowth > 10) insights.push({ type: "success", text: `Impulsor de crecimiento: ${topGrowthLine.linea} crece ${formatPercent(topGrowthLine.yoyGrowth)} YoY.` });
    else if (globalGrowth !== null && globalGrowth < 0) insights.push({ type: "warning", text: `Contraccion general: la facturacion cae ${formatPercent(Math.abs(globalGrowth))} contra el periodo anterior.` });

    if (topTicketLine && avgGlobalTicket > 0) insights.push({ type: "info", text: `Alto valor: ${topTicketLine.linea} tiene el mejor ticket promedio (${formatCurrencyCompact(topTicketLine.ticketPromedio)}).` });

    return { totalFacturado, totalOperaciones, avgGlobalTicket, avgGlobalOps, globalGrowth, billingByLine, quadrants, top3Concentration, insights };
  }, [filteredRows, previousYearRows]);

  const chartDataTop = analytics.billingByLine.slice(0, 10);
  const chartDataGrowth = [...analytics.billingByLine].filter((row) => row.yoyGrowth !== null).sort((a, b) => (b.yoyGrowth ?? 0) - (a.yoyGrowth ?? 0));

  return (
    <div className="min-h-screen space-y-6 bg-[#050b14] p-4 text-slate-100 selection:bg-sky-500/30 sm:p-6 lg:p-8">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-sky-900/20 blur-[120px]" /><div className="absolute bottom-[-10%] right-[-10%] h-[30%] w-[30%] rounded-full bg-indigo-900/10 blur-[100px]" /></div>
      <div className="relative z-10 mx-auto max-w-[1600px] space-y-6">
        <header className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/5 bg-slate-900/40 p-6 backdrop-blur-md xl:flex-row xl:items-end">
          <div className="max-w-2xl"><div className="mb-2 flex items-center gap-3 text-sky-400"><Activity className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Facturacion Estrategica</span></div><h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Analisis por Linea de Negocio</h1><p className="mt-2 text-sm leading-relaxed text-slate-400">Descubre motores de rentabilidad, crecimiento YoY y oportunidades en la matriz de eficiencia operativa.</p></div>
          <div className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-4 shadow-inner xl:w-auto"><div className="flex min-w-[150px] flex-col gap-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Año</label><select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none transition-colors focus:border-sky-500"><option value={ALL_VALUE}>Todos los años</option>{summary.years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div><div className="flex min-w-[180px] flex-col gap-1.5"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Negocio</label><select value={selectedNegocio} onChange={(event) => setSelectedNegocio(event.target.value)} className="rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none transition-colors focus:border-sky-500"><option value={ALL_VALUE}>Todos los negocios</option>{summary.negocios.map((negocio) => <option key={negocio} value={negocio}>{negocio}</option>)}</select></div></div>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {analytics.insights.map((insight, index) => {
            const color = { warning: "border-amber-500/30 bg-amber-500/5 text-amber-200", success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200", info: "border-sky-500/30 bg-sky-500/5 text-sky-200" }[insight.type];
            const icon = insight.type === "warning" ? <AlertCircle className="h-5 w-5 text-amber-400" /> : insight.type === "success" ? <Rocket className="h-5 w-5 text-emerald-400" /> : <Lightbulb className="h-5 w-5 text-sky-400" />;
            return <div key={`${insight.type}-${index}`} className={`flex items-start gap-3 rounded-2xl border p-4 backdrop-blur-md ${color}`}><div className="mt-0.5 rounded-lg bg-black/20 p-2 shadow-inner">{icon}</div><p className="text-sm font-medium leading-relaxed">{insight.text}</p></div>;
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Ingreso Total" value={formatCurrency(analytics.totalFacturado)} icon={ReceiptText} color="sky" trend={analytics.globalGrowth} />
          <KpiCard title="Ticket Promedio" value={formatCurrency(analytics.avgGlobalTicket)} icon={Target} color="indigo" subtitle={`Base: ${analytics.totalOperaciones} ops`} />
          <KpiCard title="Riesgo Pareto Top 3" value={formatPercent(analytics.top3Concentration)} icon={PieChartIcon} color={analytics.top3Concentration > 70 ? "rose" : analytics.top3Concentration > 50 ? "amber" : "emerald"} />
          <KpiCard title="Linea Dominante" value={analytics.billingByLine[0]?.linea || "-"} icon={Building2} color="slate" subtitle={analytics.billingByLine[0] ? `${formatPercent(analytics.billingByLine[0].salesShare)} del total` : ""} />
        </div>

        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-1.5 backdrop-blur-md">
          <TabButton active={activeTab === "resumen"} onClick={() => setActiveTab("resumen")} icon={LayoutDashboard}>Facturacion y Crecimiento</TabButton>
          <TabButton active={activeTab === "pareto"} onClick={() => setActiveTab("pareto")} icon={TrendingUp}>Composicion y Pareto</TabButton>
          <TabButton active={activeTab === "eficiencia"} onClick={() => setActiveTab("eficiencia")} icon={Target}>Matriz Estrategica BCG</TabButton>
          <TabButton active={activeTab === "detalle"} onClick={() => setActiveTab("detalle")} icon={ListOrdered}>Desglose Tabular</TabButton>
        </div>

        {activeTab === "resumen" ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><ShellCard><ShellCardHeader><ShellCardTitle>Top Lineas de Mayor Facturacion</ShellCardTitle><p className="mt-1 text-sm text-slate-400">Ingresos brutos generados en el periodo actual.</p></ShellCardHeader><ShellCardContent className="h-[400px]">{chartDataTop.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartDataTop} layout="vertical" margin={{ left: 10, right: 30 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} /><XAxis type="number" tickFormatter={formatCurrencyCompact} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE} /><YAxis type="category" dataKey="linea" width={140} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE} /><Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<CustomTooltip format="currency" />} /><Bar dataKey="ventasMonto" radius={[0, 6, 6, 0]} barSize={24}>{chartDataTop.map((entry, index) => <Cell key={entry.linea} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyState />}</ShellCardContent></ShellCard><ShellCard><ShellCardHeader><ShellCardTitle>Evolucion YoY por Linea</ShellCardTitle><p className="mt-1 text-sm text-slate-400">Crecimiento porcentual comparado con el año anterior.</p></ShellCardHeader><ShellCardContent className="h-[400px]">{chartDataGrowth.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartDataGrowth} layout="vertical" margin={{ left: 10, right: 30 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} /><XAxis type="number" tickFormatter={(value) => `${value}%`} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE} /><YAxis type="category" dataKey="linea" width={140} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE} /><Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<CustomTooltip format="percent" dataKey="yoyGrowth" name="Crecimiento YoY" />} /><ReferenceLine x={0} stroke="#475569" strokeWidth={2} /><Bar dataKey="yoyGrowth" radius={6} barSize={24}>{chartDataGrowth.map((entry) => <Cell key={entry.linea} fill={(entry.yoyGrowth ?? 0) >= 0 ? "#10b981" : "#f43f5e"} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyState msg="Selecciona un año especifico para ver variacion YoY." />}</ShellCardContent></ShellCard></div> : null}
        {activeTab === "pareto" ? <div className="grid gap-6 lg:grid-cols-[1fr_350px]"><ShellCard><ShellCardHeader><ShellCardTitle>Curva de Pareto de Ingresos</ShellCardTitle><p className="mt-1 text-sm text-slate-400">Identifica las lineas que generan el mayor valor.</p></ShellCardHeader><ShellCardContent className="h-[450px]">{analytics.billingByLine.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={analytics.billingByLine} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} /><XAxis dataKey="linea" angle={-45} textAnchor="end" height={80} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE} interval={0} /><YAxis yAxisId="left" tickFormatter={formatCurrencyCompact} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE} /><YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value}%`} stroke="#a3e635" fontSize={11} /><Tooltip content={<CustomTooltip format="pareto" />} /><Legend wrapperStyle={{ paddingTop: "20px", color: "#cbd5e1" }} /><Bar yAxisId="left" dataKey="ventasMonto" name="Ventas PEN" fill="#0ea5e9" radius={[4, 4, 0, 0]} /><Line yAxisId="right" type="monotone" dataKey="cumulativeShare" name="% Acumulado" stroke="#a3e635" strokeWidth={3} dot={{ r: 4, fill: "#a3e635", strokeWidth: 2, stroke: "#0f172a" }} /></ComposedChart></ResponsiveContainer> : <EmptyState />}</ShellCardContent></ShellCard><ShellCard className="flex flex-col"><ShellCardHeader><ShellCardTitle>Market Share Interno Top 5</ShellCardTitle></ShellCardHeader><ShellCardContent className="flex flex-1 flex-col"><div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.billingByLine.slice(0, 5)} dataKey="ventasMonto" nameKey="linea" innerRadius="60%" outerRadius="80%" paddingAngle={3} stroke="none">{analytics.billingByLine.slice(0, 5).map((entry, index) => <Cell key={entry.linea} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip format="currency" />} /></PieChart></ResponsiveContainer></div><div className="mt-4 flex-1 space-y-3 overflow-auto">{analytics.billingByLine.slice(0, 5).map((row, index) => <div key={row.linea} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-2 text-sm"><div className="flex items-center gap-3"><div className="h-3 w-3 rounded-full shadow-lg" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><span className="w-32 truncate font-medium text-slate-300">{row.linea}</span></div><span className="font-bold text-white">{formatPercent(row.salesShare)}</span></div>)}</div></ShellCardContent></ShellCard></div> : null}

        {activeTab === "eficiencia" ? <ShellCard><ShellCardHeader className="flex flex-col items-start justify-between md:flex-row md:items-center"><div><ShellCardTitle>Matriz BCG Operativa</ShellCardTitle><p className="mt-1 text-sm text-slate-400">Clasificacion estrategica por volumen y ticket promedio.</p></div><div className="mt-4 flex gap-4 rounded-xl border border-white/5 bg-black/30 p-3 text-xs font-medium md:mt-0"><div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-[#10b981]" />Lideres</div><div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-[#8b5cf6]" />Nichos</div><div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-[#0ea5e9]" />Transaccionales</div><div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-[#64748b]" />Rezagados</div></div></ShellCardHeader><ShellCardContent className="h-[550px]">{analytics.billingByLine.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" /><XAxis type="number" dataKey="operaciones" name="Operaciones" {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE}><RechartsLabel value="Volumen de Operaciones" offset={-10} position="insideBottom" fill="#94a3b8" fontSize={12} /></XAxis><YAxis type="number" dataKey="ticketPromedio" name="Ticket Promedio" tickFormatter={formatCurrencyCompact} {...CHART_AXIS_STYLE} tick={CHART_TICK_STYLE}><RechartsLabel value="Ticket Promedio PEN" angle={-90} position="insideLeft" fill="#94a3b8" fontSize={12} /></YAxis><ZAxis type="number" dataKey="ventasMonto" range={[100, 2500]} name="Ventas Totales" /><Tooltip cursor={{ strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.2)" }} content={<MatrixTooltip />} /><ReferenceLine x={analytics.avgGlobalOps} stroke="#facc15" strokeDasharray="5 5" label={{ value: "Promedio Ops", fill: "#facc15", fontSize: 11, position: "top" }} /><ReferenceLine y={analytics.avgGlobalTicket} stroke="#facc15" strokeDasharray="5 5" label={{ value: "Promedio Ticket", fill: "#facc15", fontSize: 11, position: "right" }} /><Scatter name="Portafolio" data={analytics.billingByLine}>{analytics.billingByLine.map((entry, index) => { let color = "#64748b"; if (analytics.quadrants.lideres.includes(entry.linea)) color = "#10b981"; if (analytics.quadrants.nichos.includes(entry.linea)) color = "#8b5cf6"; if (analytics.quadrants.transaccionales.includes(entry.linea)) color = "#0ea5e9"; return <Cell key={`${entry.linea}-${index}`} fill={color} opacity={0.8} stroke="#0f172a" strokeWidth={2} />; })}</Scatter></ScatterChart></ResponsiveContainer> : <EmptyState />}</ShellCardContent></ShellCard> : null}

        {activeTab === "detalle" ? <ShellCard className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full whitespace-nowrap text-left text-sm"><thead className="border-b border-slate-700 bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-400"><tr><th className="sticky left-0 z-10 border-r border-slate-800 bg-slate-900 px-6 py-4">Linea</th><th className="px-6 py-4 text-right">Facturacion</th><th className="px-6 py-4 text-right">Ticket Promedio</th><th className="px-6 py-4 text-right">Crecimiento YoY</th><th className="px-6 py-4 text-right">% Participacion</th><th className="px-6 py-4 text-right">Cuadrante</th></tr></thead><tbody className="divide-y divide-slate-800/50">{analytics.billingByLine.length ? analytics.billingByLine.map((row) => { const isHighDependence = row.salesShare > 25; let quadrant = "Rezagado"; let tone = "bg-slate-400/10 text-slate-400"; if (analytics.quadrants.lideres.includes(row.linea)) { quadrant = "Lider"; tone = "border-emerald-400/20 bg-emerald-400/10 text-emerald-400"; } if (analytics.quadrants.nichos.includes(row.linea)) { quadrant = "Nicho Alto Valor"; tone = "border-purple-400/20 bg-purple-400/10 text-purple-400"; } if (analytics.quadrants.transaccionales.includes(row.linea)) { quadrant = "Transaccional"; tone = "border-sky-400/20 bg-sky-400/10 text-sky-400"; } return <tr key={row.linea} className="group transition-colors hover:bg-slate-800/40"><td className="sticky left-0 z-10 border-r border-slate-800 bg-[#0f172a] px-6 py-4 font-semibold text-slate-200 group-hover:bg-[#151f32]"><div className="flex items-center gap-2">{row.linea}{isHighDependence ? <span className="rounded border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber-400">Motor</span> : null}</div></td><td className="px-6 py-4 text-right font-bold tabular-nums text-sky-400">{formatCurrency(row.ventasMonto)}</td><td className="px-6 py-4 text-right tabular-nums text-slate-300">{formatCurrency(row.ticketPromedio)}</td><td className={`px-6 py-4 text-right font-medium tabular-nums ${row.yoyGrowth === null ? "text-slate-500" : row.yoyGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{row.yoyGrowth !== null ? (row.yoyGrowth >= 0 ? `+${formatPercent(row.yoyGrowth)}` : formatPercent(row.yoyGrowth)) : "N/A"}</td><td className="px-6 py-4 text-right tabular-nums text-slate-300"><div className="flex items-center justify-end gap-2"><span>{formatPercent(row.salesShare)}</span><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-sky-500" style={{ width: `${Math.min(row.salesShare, 100)}%` }} /></div></div></td><td className="px-6 py-4 text-right"><span className={`inline-block rounded-md border border-transparent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone}`}>{quadrant}</span></td></tr>; }) : <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No hay datos para mostrar.</td></tr>}</tbody></table></div></ShellCard> : null}
      </div>
    </div>
  );
}
