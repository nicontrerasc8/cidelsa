"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, BarChart3, Rows3, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer } from "@/components/charts/chart-container";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const ALL_VALUE = "__all__";
const YEAR_ALL_VALUE = "__all_years__";
const MONTH_ALL_VALUE = "__all_months__";
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Setiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
const CHART_COLORS = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#65a30d",
  "#c026d3",
  "#ea580c",
  "#475569",
] as const;
const CHART_TICK_STYLE = { fill: "#ffffff", fontSize: 13 } as const;
const CHART_AXIS_STYLE = { stroke: "rgba(255, 255, 255, 0.28)" } as const;

type DashboardRow = {
  importYear: number | null;
  negocio: string | null;
  linea: string | null;
  cliente: string | null;
  situacion: string | null;
  ejecutivo: string | null;
  monthIndex: number | null;
  ventasMonto: number;
};

type DashboardSummary = {
  years: number[];
  negocios: string[];
  situaciones: string[];
  ejecutivos: string[];
  lineas: string[];
  rows: DashboardRow[];
};

type RankingScope = "lineas" | "clientes" | "ejecutivos";

function formatPen(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-white/12 text-base text-white/70">
      {label}
    </div>
  );
}

function FilterField({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/14 bg-black/15 p-3">
      <Label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-white/68">
        {label}
      </Label>
      <select
        className="flex h-11 w-full rounded-xl border border-white/14 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BacklogRankingDetailView({
  summary,
  scope,
  basePath,
  eyebrow,
  title,
  filters,
}: {
  summary: DashboardSummary;
  scope: RankingScope;
  basePath: string;
  eyebrow: string;
  title: string;
  filters: {
    anio?: string;
    negocio?: string;
    situacion?: string;
    ejecutivo?: string;
    linea?: string;
    mes?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedYear = filters.anio ?? YEAR_ALL_VALUE;
  const selectedNegocio = filters.negocio ?? ALL_VALUE;
  const selectedSituacion = filters.situacion ?? ALL_VALUE;
  const selectedEjecutivo = filters.ejecutivo ?? ALL_VALUE;
  const selectedLinea = filters.linea ?? ALL_VALUE;
  const selectedMonth = filters.mes ?? MONTH_ALL_VALUE;

  const showExecutiveFilter = summary.ejecutivos.length > 0;
  const showSituacionFilter = summary.situaciones.length > 1;

  const availableLineas = useMemo(() => {
    if (selectedNegocio === ALL_VALUE) return [];

    const lineas = new Set<string>();

    for (const row of summary.rows) {
      if (row.negocio === selectedNegocio && row.linea) {
        lineas.add(row.linea);
      }
    }

    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedNegocio, summary.rows]);

  const filteredRows = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedYear !== YEAR_ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedSituacion !== ALL_VALUE && row.situacion !== selectedSituacion) return false;
      if (showExecutiveFilter && selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) {
        return false;
      }
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      if (selectedMonth !== MONTH_ALL_VALUE && row.monthIndex !== Number(selectedMonth)) return false;
      return true;
    });
  }, [
    selectedEjecutivo,
    selectedLinea,
    selectedMonth,
    selectedNegocio,
    selectedSituacion,
    selectedYear,
    showExecutiveFilter,
    summary.rows,
  ]);

  const analytics = useMemo(() => {
    const byLinea = new Map<string, number>();
    const byCliente = new Map<string, number>();
    const byEjecutivo = new Map<string, number>();
    const byMonth = new Array<number>(12).fill(0);

    for (const row of filteredRows) {
      byLinea.set(row.linea ?? "Sin línea", (byLinea.get(row.linea ?? "Sin línea") ?? 0) + row.ventasMonto);
      byCliente.set(row.cliente ?? "Sin cliente", (byCliente.get(row.cliente ?? "Sin cliente") ?? 0) + row.ventasMonto);
      byEjecutivo.set(row.ejecutivo ?? "Sin ejecutivo", (byEjecutivo.get(row.ejecutivo ?? "Sin ejecutivo") ?? 0) + row.ventasMonto);

      if (row.monthIndex !== null) {
        byMonth[row.monthIndex] += row.ventasMonto;
      }
    }

    const sortEntries = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
      lineas: sortEntries(byLinea),
      clientes: sortEntries(byCliente),
      ejecutivos: sortEntries(byEjecutivo),
      months: MONTH_LABELS.map((month, index) => ({ name: month, value: byMonth[index] })),
    };
  }, [filteredRows]);

  const config =
    scope === "lineas"
      ? { data: analytics.lineas, label: "Línea", color: "#86cf47" }
      : scope === "clientes"
        ? { data: analytics.clientes, label: "Cliente", color: "#d97706" }
        : { data: analytics.ejecutivos, label: "Ejecutivo", color: "#4fa3ff" };

  const totalMonto = config.data.reduce((sum, item) => sum + item.value, 0);
  const topItem = config.data[0];

  function buildParams(overrides?: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(overrides ?? {})) {
      if (!value || value === ALL_VALUE || value === YEAR_ALL_VALUE || value === MONTH_ALL_VALUE) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    return params;
  }

  function pushFilters(overrides: Record<string, string>) {
    const params = buildParams(overrides);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function buildScopeHref(nextScope: RankingScope) {
    const params = buildParams({ scope: nextScope });
    return `${basePath}/detalle?${params.toString()}`;
  }

  function buildBackHref() {
    const params = buildParams();
    params.delete("scope");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#07131f_0%,#17314b_42%,#86cf47_100%)] p-6 text-white shadow-[0_24px_80px_rgba(7,19,31,0.28)]">
        <div className="flex flex-col gap-4">
          <Link
            href={buildBackHref()}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-white/90 transition hover:bg-white/16"
          >
            <ArrowLeft className="size-4" />
            Volver al dashboard
          </Link>

          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">{eyebrow}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Vista detallada con filtros por año, mes, negocio, línea, ejecutivo y situación según el contexto actual.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-2 xl:grid-cols-3">
            <FilterField
              label="Año"
              value={selectedYear}
              onChange={(value) => pushFilters({ anio: value })}
              options={[
                { label: "Todos los años", value: YEAR_ALL_VALUE },
                ...summary.years.map((year) => ({ label: String(year), value: String(year) })),
              ]}
            />
            <FilterField
              label="Negocio"
              value={selectedNegocio}
              onChange={(value) => pushFilters({ negocio: value, linea: ALL_VALUE })}
              options={[
                { label: "Todos los negocios", value: ALL_VALUE },
                ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
              ]}
            />
            <FilterField
              label="Línea"
              value={selectedLinea}
              onChange={(value) => pushFilters({ linea: value })}
              disabled={selectedNegocio === ALL_VALUE}
              options={[
                { label: "Todas las líneas", value: ALL_VALUE },
                ...availableLineas.map((linea) => ({ label: linea, value: linea })),
              ]}
            />
            {showExecutiveFilter ? (
              <FilterField
                label="Ejecutivo"
                value={selectedEjecutivo}
                onChange={(value) => pushFilters({ ejecutivo: value })}
                options={[
                  { label: "Todos los ejecutivos", value: ALL_VALUE },
                  ...summary.ejecutivos.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo })),
                ]}
              />
            ) : null}
            {showSituacionFilter ? (
              <FilterField
                label="Situación"
                value={selectedSituacion}
                onChange={(value) => pushFilters({ situacion: value })}
                options={[
                  { label: "Todas las situaciones", value: ALL_VALUE },
                  ...summary.situaciones.map((situacion) => ({
                    label: situacion,
                    value: situacion,
                  })),
                ]}
              />
            ) : null}
            <FilterField
              label="Mes"
              value={selectedMonth}
              onChange={(value) => pushFilters({ mes: value })}
              options={[
                { label: "Todos los meses", value: MONTH_ALL_VALUE },
                ...MONTH_LABELS.map((month, index) => ({ label: month, value: String(index) })),
              ]}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildScopeHref("lineas")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                scope === "lineas"
                  ? "bg-white text-slate-950"
                  : "border border-white/14 bg-white/10 text-white/85"
              }`}
            >
              Líneas
            </Link>
            <Link
              href={buildScopeHref("clientes")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                scope === "clientes"
                  ? "bg-white text-slate-950"
                  : "border border-white/14 bg-white/10 text-white/85"
              }`}
            >
              Clientes
            </Link>
            <Link
              href={buildScopeHref("ejecutivos")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                scope === "ejecutivos"
                  ? "bg-white text-slate-950"
                  : "border border-white/14 bg-white/10 text-white/85"
              }`}
            >
              Ejecutivos
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title="Monto visible" value={totalMonto} icon={TrendingUp} tone="primary" />
        <KpiCard
          title={`Total de ${config.label.toLowerCase()}s`}
          value={config.data.length}
          icon={Rows3}
          tone="success"
          format="number"
        />
        <KpiCard title="Principal" value={topItem?.value ?? 0} icon={BarChart3} tone="warning" />
      </section>

      <section className="grid gap-6 w-full xl:grid-cols-2">
        <Card className="border-border/60 bg-[#07131f] text-white xl:col-span-2">
          <CardHeader>
            <CardTitle>Participación del top 10</CardTitle>
          </CardHeader>
          <CardContent className="h-[420px]">
            {config.data.length ? (
              <div className="grid h-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <ChartContainer>
                  <PieChart>
                    <Pie
                      data={config.data.slice(0, 10)}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={150}
                      innerRadius={74}
                    >
                      {config.data.slice(0, 10).map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatPen(Number(value ?? 0))} />
                  </PieChart>
                </ChartContainer>
                <div className="overflow-y-auto pr-1">
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/10 text-white">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">#</th>
                          <th className="px-3 py-2 text-left font-semibold">{config.label}</th>
                          <th className="px-3 py-2 text-right font-semibold">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.data.slice(0, 10).map((entry, index) => (
                          <tr key={entry.name} className="border-t border-white/10 text-white/90">
                            <td className="px-3 py-2">{index + 1}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                                />
                                <span>{entry.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {formatPen(entry.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <ChartEmpty label="No hay participación para mostrar." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-[#07131f] text-white xl:col-span-2">
          <CardHeader>
            <CardTitle>Comportamiento por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            {analytics.months.some((entry) => entry.value > 0) ? (
              <ChartContainer>
                <BarChart data={analytics.months} margin={{ left: 12, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={72}
                    tick={CHART_TICK_STYLE}
                    axisLine={CHART_AXIS_STYLE}
                    tickLine={CHART_AXIS_STYLE}
                  />
                  <YAxis
                    tickFormatter={(value) => formatPen(Number(value))}
                    tick={CHART_TICK_STYLE}
                    axisLine={CHART_AXIS_STYLE}
                    tickLine={CHART_AXIS_STYLE}
                  />
                  <Tooltip formatter={(value) => formatPen(Number(value ?? 0))} />
                  <Bar dataKey="value" fill={config.color} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <ChartEmpty label="No hay meses con datos visibles." />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tabla completa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-[#44536c] text-white">
                  <tr>
                    <th className="px-4 py-4 text-left font-semibold">#</th>
                    <th className="px-4 py-4 text-left font-semibold">{config.label}</th>
                    <th className="px-4 py-4 text-right font-semibold">Monto</th>
                    <th className="px-4 py-4 text-right font-semibold">% del total</th>
                  </tr>
                </thead>
                <tbody className="bg-[#061018] text-white">
                  {config.data.length ? (
                    config.data.map((entry, index) => {
                      const percentage = totalMonto > 0 ? (entry.value / totalMonto) * 100 : 0;

                      return (
                        <tr
                          key={entry.name}
                          className={
                            index % 2 === 0
                              ? "border-t border-white/8 bg-black/80"
                              : "border-t border-white/8 bg-white/[0.03]"
                          }
                        >
                          <td className="px-4 py-3.5">{index + 1}</td>
                          <td className="px-4 py-3.5">{entry.name}</td>
                          <td className="px-4 py-3.5 text-right font-semibold">{formatPen(entry.value)}</td>
                          <td className="px-4 py-3.5 text-right">{percentage.toFixed(1)}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-white/70">
                        No hay filas para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
