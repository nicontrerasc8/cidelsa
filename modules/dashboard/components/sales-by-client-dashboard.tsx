"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Line,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  Receipt, 
  LayoutDashboard, 
  TrendingUp, 
  ListOrdered 
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

export type SalesByClientSummary = {
  years: number[];
  negocios: string[];
  lineas: string[];
  rows: Array<{
    importYear: number | null;
    negocio: string | null;
    linea: string | null;
    cliente: string;
    ventasMonto: number;
  }>;
};

function KpiCard({
  title,
  value,
  icon: Icon,
  format,
  valueFormatter,
  description,
}: {
  title: string;
  value: number;
  icon?: LucideIcon;
  tone?: string;
  format?: "number";
  valueFormatter?: (value: number) => string;
  description?: string;
}) {
  const displayValue = valueFormatter ? valueFormatter(value) : format === "number" ? new Intl.NumberFormat().format(value) : value;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

const ALL_VALUE = "__all__";
const CHART_COLORS = [
  "#38bdf8", "#22d3ee", "#a3e635", "#facc15", 
  "#f97316", "#fb7185", "#c084fc", "#818cf8"
] as const;

type AbcClass = "A" | "B" | "C";

type ClientAggregate = {
  cliente: string;
  ventasMonto: number;
  operaciones: number;
  abcClass: AbcClass;
  salesShare: number;
  cumulativeShare: number;
};

// Utilidades de formato locales para asegurar que no se rompa
function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
}
function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}
function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function getAbcClass(cumulativeShare: number): AbcClass {
  if (cumulativeShare <= 80) return "A";
  if (cumulativeShare <= 95) return "B";
  return "C";
}

function getAbcBadgeClass(value: AbcClass) {
  if (value === "A") return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  if (value === "B") return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  return "bg-slate-500/20 text-slate-300 border border-slate-500/30";
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
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-white/50">{label}</Label>
      <select
        className="w-full bg-white/10 border border-white/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:ring-1 ring-sky-400 transition-all"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#1e293b]">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const mockSummary: SalesByClientSummary = {
  years: [2023, 2024],
  negocios: ["Retail", "Mayorista", "Industrial"],
  lineas: ["Línea A", "Línea B", "Línea C"],
  rows: [
    { importYear: 2024, negocio: "Retail", linea: "Línea A", cliente: "Tech Solutions SAC", ventasMonto: 850000 },
    { importYear: 2024, negocio: "Mayorista", linea: "Línea B", cliente: "Global Retailers", ventasMonto: 620000 },
    { importYear: 2024, negocio: "Industrial", linea: "Línea C", cliente: "Industrias del Norte", ventasMonto: 410000 },
    { importYear: 2024, negocio: "Retail", linea: "Línea A", cliente: "Comercializadora Sur", ventasMonto: 150000 },
    { importYear: 2023, negocio: "Retail", linea: "Línea A", cliente: "Tech Solutions SAC", ventasMonto: 500000 },
    { importYear: 2024, negocio: "Mayorista", linea: "Línea B", cliente: "Importaciones Lima", ventasMonto: 85000 },
    { importYear: 2024, negocio: "Retail", linea: "Línea B", cliente: "Boutique Central", ventasMonto: 45000 },
    { importYear: 2024, negocio: "Industrial", linea: "Línea C", cliente: "Constructora Andina", ventasMonto: 25000 },
    { importYear: 2024, negocio: "Mayorista", linea: "Línea A", cliente: "Distribuidora Este", ventasMonto: 12000 },
    { importYear: 2024, negocio: "Retail", linea: "Línea C", cliente: "Tiendas Unidas", ventasMonto: 5000 },
  ]
};

export  function SalesByClientDashboard({
  summary = mockSummary,
}: {
  summary?: SalesByClientSummary;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);

  const filteredRows = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      return true;
    });
  }, [selectedLinea, selectedNegocio, selectedYear, summary.rows]);

  const clientRanking = useMemo(() => {
    const aggregates = new Map<string, ClientAggregate>();

    for (const row of filteredRows) {
      const current = aggregates.get(row.cliente);

      if (current) {
        current.ventasMonto += row.ventasMonto;
        current.operaciones += 1;
        continue;
      }

      aggregates.set(row.cliente, {
        cliente: row.cliente,
        ventasMonto: row.ventasMonto,
        operaciones: 1,
        abcClass: "C",
        salesShare: 0,
        cumulativeShare: 0,
      });
    }

    const ranking = [...aggregates.values()].sort((a, b) => b.ventasMonto - a.ventasMonto);
    const totalVentas = ranking.reduce((sum, row) => sum + row.ventasMonto, 0);

    return ranking.reduce<ClientAggregate[]>((acc, row) => {
      const salesShare = totalVentas ? (row.ventasMonto / totalVentas) * 100 : 0;
      const previousCumulativeShare = acc[acc.length - 1]?.cumulativeShare ?? 0;
      const cumulativeShare = previousCumulativeShare + salesShare;

      acc.push({
        ...row,
        salesShare,
        cumulativeShare,
        abcClass: getAbcClass(cumulativeShare),
      });

      return acc;
    }, []);
  }, [filteredRows]);

  // Insights Analíticos Adicionales
  const topClients = clientRanking.slice(0, 10);
  const paretoClients = clientRanking.slice(0, 30); // Limitar a 30 para el gráfico de Pareto
  const totalVentas = clientRanking.reduce((sum, row) => sum + row.ventasMonto, 0);
  const totalOperaciones = filteredRows.length;
  const avgTicket = totalOperaciones > 0 ? totalVentas / totalOperaciones : 0;
  
  // Riesgo de concentración (Top 5 Clientes)
  const top5Concentration = clientRanking.slice(0, 5).reduce((sum, c) => sum + c.salesShare, 0);
  const concentrationRiskLevel = top5Concentration > 50 ? "Alto" : top5Concentration > 30 ? "Medio" : "Bajo";

  const abcCounts = useMemo(
    () =>
      clientRanking.reduce(
        (acc, row) => {
          acc[row.abcClass] += 1;
          return acc;
        },
        { A: 0, B: 0, C: 0 } as Record<AbcClass, number>,
      ),
    [clientRanking],
  );

  const negocioOptions = useMemo(() => [{ label: "Todos los negocios", value: ALL_VALUE }, ...summary.negocios.map((n) => ({ label: n, value: n }))], [summary.negocios]);
  const availableLineas = useMemo(() => {
    if (selectedNegocio === ALL_VALUE) return summary.lineas;
    const lineas = new Set<string>();
    for (const row of summary.rows) {
      if (row.negocio === selectedNegocio && row.linea) lineas.add(row.linea);
    }
    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedNegocio, summary.lineas, summary.rows]);
  const lineaOptions = useMemo(() => [{ label: "Todas las lineas", value: ALL_VALUE }, ...availableLineas.map((l) => ({ label: l, value: l }))], [availableLineas]);
  const yearOptions = useMemo(() => [{ label: "Todos los Años", value: ALL_VALUE }, ...summary.years.map((y) => ({ label: String(y), value: String(y) }))], [summary.years]);

  return (
    <div className="space-y-6 p-2 lg:p-4 bg-[#020617] min-h-screen text-slate-100">
      
      {/* HEADER ESTRATÉGICO */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-400 font-semibold mb-2">
              Inteligencia Comercial
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Análisis y Retención de Clientes
            </h1>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              Mapeo de cartera mediante clasificación ABC, concentración de riesgo y análisis de Pareto para identificar cuentas clave y optimizar la rentabilidad comercial.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full lg:w-auto bg-black/20 p-4 rounded-2xl backdrop-blur-md border border-white/5 shadow-inner">
            <FilterSelect label="Año" value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
            <FilterSelect label="Negocio" value={selectedNegocio} options={negocioOptions} onChange={(v: string) => { setSelectedNegocio(v); setSelectedLinea(ALL_VALUE); }} />
            <FilterSelect label="Línea" value={selectedLinea} options={lineaOptions} onChange={setSelectedLinea} />
          </div>
        </div>
      </header>

      {/* KPI SECTION MEJORADA */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Ventas Totales" 
          value={totalVentas} 
          icon={BarChart3} 
          valueFormatter={formatCurrency} 
          tone="primary"
        />
        <KpiCard 
          title="Ticket Promedio" 
          value={avgTicket} 
          icon={Receipt} 
          valueFormatter={formatCurrency} 
          tone="success" 
          description={`${totalOperaciones} operaciones totales`}
        />
        <KpiCard 
          title="Concentración Top 5" 
          value={top5Concentration} 
          icon={AlertTriangle} 
          valueFormatter={(v: number) => `${v.toFixed(1)}%`} 
          tone={concentrationRiskLevel === "Alto" ? "danger" : concentrationRiskLevel === "Medio" ? "warning" : "success"}
          description={`Nivel de Riesgo: ${concentrationRiskLevel}`}
        />
        <KpiCard 
          title="Clientes Analizados" 
          value={clientRanking.length} 
          icon={Users} 
          tone="default" 
          format="number"
          description={`${abcCounts.A} clientes son Clase A (80% ventas)`}
        />
      </section>

      {/* TABS DE NAVEGACIÓN */}
      <Tabs defaultValue="resumen" className="w-full space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl h-auto flex flex-wrap gap-2">
          <TabsTrigger value="resumen" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <LayoutDashboard size={18} /> Resumen Top 10
          </TabsTrigger>
          <TabsTrigger value="pareto" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <TrendingUp size={18} /> Curva de Pareto & ABC
          </TabsTrigger>
          <TabsTrigger value="detalle" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white px-4 py-2 gap-2 text-sm font-medium transition-all">
            <ListOrdered size={18} /> Cartera Detallada
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA: RESUMEN TOP 10 */}
        <TabsContent value="resumen" className="m-0">
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader>
              <CardTitle>Top 10 Clientes Estratégicos</CardTitle>
              <p className="text-sm text-slate-400">Las cuentas con mayor volumen de facturación monetaria.</p>
            </CardHeader>
            <CardContent className="h-[450px]">
              {topClients.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClients} layout="vertical" margin={{ left: 24, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrencyCompact(v)} stroke="#94a3b8" fontSize={12} />
                    <YAxis type="category" dataKey="cliente" width={180} stroke="#94a3b8" fontSize={11} />
                    <Tooltip
                      cursor={{ fill: "rgba(56, 189, 248, 0.05)" }}
                      contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px", color: "#fff" }}
                      formatter={(v: unknown) => formatCurrency(Number(v ?? 0))}
                    />
                    <Bar dataKey="ventasMonto" radius={[0, 6, 6, 0]} barSize={24}>
                      {topClients.map((entry, index) => (
                        <Cell key={entry.cliente} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
        </TabsContent>

        {/* PESTAÑA: PARETO & ABC */}
        <TabsContent value="pareto" className="m-0 space-y-6">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            <Card className="bg-slate-900 border-slate-800 shadow-xl">
              <CardHeader>
                <CardTitle>Análisis de Pareto (Top 30)</CardTitle>
                <p className="text-sm text-slate-400">Distribución de ingresos vs. Participación acumulada (% Acum.).</p>
              </CardHeader>
              <CardContent className="h-[450px]">
                {paretoClients.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoClients} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="cliente" angle={-45} textAnchor="end" height={80} stroke="#94a3b8" fontSize={10} interval={0} />
                      <YAxis yAxisId="left" tickFormatter={(v) => formatCurrencyCompact(v)} stroke="#94a3b8" fontSize={11} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} stroke="#a3e635" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                        labelStyle={{ color: "#38bdf8", fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar yAxisId="left" dataKey="ventasMonto" name="Ventas (S/)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulativeShare" name="% Acumulado" stroke="#a3e635" strokeWidth={3} dot={{ r: 3, fill: "#a3e635" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center border border-dashed border-slate-700 rounded-xl text-sm text-slate-500">
                    No hay datos suficientes para el gráfico de Pareto.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 shadow-xl flex flex-col">
              <CardHeader>
                <CardTitle>Resumen ABC</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {clientRanking.length ? (
                  (["A", "B", "C"] as const).map((abcClass) => {
                    const count = abcCounts[abcClass];
                    const sales = clientRanking.filter((r) => r.abcClass === abcClass).reduce((s, r) => s + r.ventasMonto, 0);
                    const classPercentage = totalVentas ? (sales / totalVentas) * 100 : 0;

                    return (
                      <div key={abcClass} className="rounded-xl border border-slate-800 bg-slate-950 p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
                        <div className={`absolute top-0 right-0 p-2 text-[10px] font-bold ${getAbcBadgeClass(abcClass)} rounded-bl-lg`}>
                          CLASE {abcClass}
                        </div>
                        <p className="mt-2 text-2xl font-semibold text-white">{count} <span className="text-sm font-normal text-slate-400">clientes</span></p>
                        <p className="mt-4 text-xl font-bold text-sky-400">{formatCurrencyCompact(sales)}</p>
                        <div className="w-full bg-slate-800 h-1.5 mt-2 rounded-full overflow-hidden">
                          <div className="bg-sky-400 h-full" style={{ width: `${classPercentage}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 text-right">{classPercentage.toFixed(1)}% del total</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-700 rounded-xl p-6 text-sm text-slate-500">
                    Ajusta los filtros.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PESTAÑA: DETALLE DE CARTERA */}
        <TabsContent value="detalle" className="m-0">
          <Card className="bg-slate-900 border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">#</th>
                    <th className="px-6 py-4 font-semibold">Razón Social del Cliente</th>
                    <th className="px-6 py-4 font-semibold text-center">Clase ABC</th>
                    <th className="px-6 py-4 font-semibold text-right">Ventas Totales</th>
                    <th className="px-6 py-4 font-semibold text-right">TKT Promedio</th>
                    <th className="px-6 py-4 font-semibold text-right">% Participación</th>
                    <th className="px-6 py-4 font-semibold text-right">% Acumulado</th>
                    <th className="px-6 py-4 font-semibold text-right">Operaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {clientRanking.length ? (
                    clientRanking.map((row, index) => {
                      const tktPromedio = row.ventasMonto / row.operaciones;
                      const isHighRisk = row.salesShare > 20; // Alerta si un solo cliente pesa > 20%
                      
                      return (
                        <tr key={row.cliente} className="hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 text-slate-500">{index + 1}</td>
                          <td className="px-6 py-4 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              {row.cliente}
                              {isHighRisk && <AlertTriangle size={14} className="text-rose-500" />}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${getAbcBadgeClass(row.abcClass)}`}>
                              {row.abcClass}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums font-semibold text-sky-400">{formatCurrency(row.ventasMonto)}</td>
                          <td className="px-6 py-4 text-right tabular-nums text-slate-300">{formatCurrency(tktPromedio)}</td>
                          <td className={`px-6 py-4 text-right font-medium ${isHighRisk ? 'text-rose-400' : 'text-slate-300'}`}>
                            {formatPercent(row.salesShare)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-400">{formatPercent(row.cumulativeShare)}</td>
                          <td className="px-6 py-4 text-right tabular-nums text-slate-400">{row.operaciones}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        No se encontraron clientes bajo los filtros aplicados.
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
