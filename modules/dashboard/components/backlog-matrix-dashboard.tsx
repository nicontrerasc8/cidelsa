"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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
import { Layers3, ListFilter, PackageOpen } from "lucide-react";

import { ChartContainer } from "@/components/charts/chart-container";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { type BacklogMatrixSummary } from "@/modules/dashboard/services/backlog-matrix";
import { buildBacklogMatrix } from "@/modules/dashboard/lib/backlog-matrix";

const ALL_VALUE = "__all__";
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
const CHART_COLORS = ["#86cf47", "#4fa3ff", "#f4a261", "#e76f51", "#7c3aed", "#14b8a6"] as const;
const CHART_TICK_STYLE = { fill: "#ffffff", fontSize: 13 } as const;
const CHART_AXIS_STYLE = { stroke: "rgb(255, 255, 255)" } as const;

function formatPen(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function FilterField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/14 bg-black/15 p-3">
      <Label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.22em] text-white/68">
        {label}
      </Label>
      <select
        className="flex h-11 w-full rounded-xl border border-white/14 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none transition focus-visible:ring-2 focus-visible:ring-white/40"
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

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-3xl border border-white/12 text-base text-white/70">
      {label}
    </div>
  );
}

function SituacionLegend({
  items,
}: {
  items: Array<{ name: string; value: number }>;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div
          key={item.name}
          className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
        >
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
          />
          <span className="truncate text-sm font-medium text-white">{item.name}</span>
          <span className="text-sm font-semibold text-white">{formatPen(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ChartScopeToggle({
  href,
}: {
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-full border border-white/14 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 transition hover:bg-white/16"
    >
      Ver todo
    </Link>
  );
}

function ResponsiveChartViewport({
  children,
  minWidthClassName = "min-w-[620px] sm:min-w-0",
}: {
  children: React.ReactNode;
  minWidthClassName?: string;
}) {
  return (
    <div className="h-full overflow-x-auto overflow-y-hidden">
      <div className={`h-full ${minWidthClassName}`}>{children}</div>
    </div>
  );
}

export function BacklogMatrixDashboard({
  summary,
  title = "Backlog por linea y mes",
  eyebrow = "Dashboard backlog",
  description = "",
  cardTitle = "Matriz de backlog",
  totalLabel = "Backlog total",
  emptyLabel = "No hay backlog para el negocio seleccionado.",
  totalVisibleLabel = "Total backlog visible:",
  showSituacionBreakdown = true,
  showEtapaFilter = true,
  defaultEtapaValue = ALL_VALUE,
}: {
  summary: BacklogMatrixSummary;
  title?: string;
  eyebrow?: string;
  description?: string;
  cardTitle?: string;
  totalLabel?: string;
  emptyLabel?: string;
  totalVisibleLabel?: string;
  showSituacionBreakdown?: boolean;
  showEtapaFilter?: boolean;
  defaultEtapaValue?: string;
}) {
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedEtapa, setSelectedEtapa] = useState<string>(defaultEtapaValue);
  const [selectedSituacion, setSelectedSituacion] = useState<string>(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_ALL_VALUE);
  const pathname = usePathname();
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const showSituacionFilter = summary.situaciones.length > 1;
  const hasEtapaFilter = showEtapaFilter && summary.etapas.length > 0;

  function syncHorizontalScroll(source: "top" | "bottom") {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;

    if (!top || !bottom) return;

    if (source === "top" && bottom.scrollLeft !== top.scrollLeft) {
      bottom.scrollLeft = top.scrollLeft;
    }

    if (source === "bottom" && top.scrollLeft !== bottom.scrollLeft) {
      top.scrollLeft = bottom.scrollLeft;
    }
  }

  const filteredSummary = useMemo(
    () => ({
      ...summary,
      rows: summary.rows.filter((row) => {
        if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
        if (
          hasEtapaFilter &&
          selectedEtapa !== ALL_VALUE &&
          row.etapa !== selectedEtapa
        ) {
          return false;
        }
        if (
          showSituacionFilter &&
          selectedSituacion !== ALL_VALUE &&
          row.situacion !== selectedSituacion
        ) {
          return false;
        }
        if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
        if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
        if (selectedMonth !== MONTH_ALL_VALUE && row.monthIndex !== Number(selectedMonth)) return false;
        return true;
      }),
    }),
    [
      selectedEjecutivo,
      selectedEtapa,
      selectedLinea,
      selectedMonth,
      selectedNegocio,
      hasEtapaFilter,
      selectedSituacion,
      showSituacionFilter,
      summary,
    ],
  );

  const matrix = useMemo(() => buildBacklogMatrix(filteredSummary, null), [filteredSummary]);

  const negocioOptions = useMemo(
    () => [
      { label: "Todos los negocios", value: ALL_VALUE },
      ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
    ],
    [summary.negocios],
  );

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

  const situacionOptions = useMemo(
    () => [
      { label: "Todas las situaciones", value: ALL_VALUE },
      ...summary.situaciones.map((situacion) => ({ label: situacion, value: situacion })),
    ],
    [summary.situaciones],
  );

  const etapaOptions = useMemo(
    () => [
      { label: "Todas las etapas", value: ALL_VALUE },
      ...summary.etapas.map((etapa) => ({ label: etapa, value: etapa })),
    ],
    [summary.etapas],
  );

  const ejecutivoOptions = useMemo(
    () => [
      { label: "Todos los ejecutivos", value: ALL_VALUE },
      ...summary.ejecutivos.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo })),
    ],
    [summary.ejecutivos],
  );

  const lineaOptions = useMemo(
    () => [
      { label: "Todas las lineas", value: ALL_VALUE },
      ...availableLineas.map((linea) => ({ label: linea, value: linea })),
    ],
    [availableLineas],
  );

  const monthOptions = useMemo(
    () => [
      { label: "Todos los meses", value: MONTH_ALL_VALUE },
      ...MONTH_LABELS.map((month, index) => ({ label: month, value: String(index) })),
    ],
    [],
  );

  const activeNegocioLabel =
    selectedNegocio === ALL_VALUE
      ? "Todos los negocios"
      : negocioOptions.find((option) => option.value === selectedNegocio)?.label ?? selectedNegocio;

  const selectedMonthLabel =
    selectedMonth === MONTH_ALL_VALUE
      ? "Todos los meses"
      : MONTH_LABELS[Number(selectedMonth)] ?? selectedMonth;

  const analytics = useMemo(() => {
    const byLinea = new Map<string, number>();
    const byEjecutivo = new Map<string, number>();
    const bySituacion = new Map<string, number>();
    const byNegocio = new Map<string, number>();
    const byCliente = new Map<string, number>();
    const byMonth = new Array<number>(12).fill(0);

    for (const row of filteredSummary.rows) {
      const linea = row.linea ?? "Sin linea";
      const cliente = row.cliente ?? "Sin cliente";
      const ejecutivo = row.ejecutivo ?? "Sin ejecutivo";
      const situacion = row.situacion ?? "Sin situacion";
      const negocio = row.negocio ?? "Sin negocio";

      byLinea.set(linea, (byLinea.get(linea) ?? 0) + row.ventasMonto);
      byCliente.set(cliente, (byCliente.get(cliente) ?? 0) + row.ventasMonto);
      byEjecutivo.set(ejecutivo, (byEjecutivo.get(ejecutivo) ?? 0) + row.ventasMonto);
      bySituacion.set(situacion, (bySituacion.get(situacion) ?? 0) + row.ventasMonto);
      byNegocio.set(negocio, (byNegocio.get(negocio) ?? 0) + row.ventasMonto);
      if (row.monthIndex !== null) {
        byMonth[row.monthIndex] += row.ventasMonto;
      }
    }

    const sortEntries = (map: Map<string, number>) =>
      [...map.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const clientesOrdenados = sortEntries(byCliente);
    const topClientes = clientesOrdenados.slice(0, 6);
    const otrosClientesMonto = clientesOrdenados
      .slice(6)
      .reduce((sum, entry) => sum + entry.value, 0);

    return {
      allLineas: sortEntries(byLinea),
      allClientes: sortEntries(byCliente),
      allEjecutivos: sortEntries(byEjecutivo),
      clientesTop:
        otrosClientesMonto > 0
          ? [...topClientes, { name: "Otros", value: otrosClientesMonto }]
          : topClientes,
      lineasTop: sortEntries(byLinea).slice(0, 8),
      ejecutivosTop: sortEntries(byEjecutivo).slice(0, 8),
      situaciones: sortEntries(bySituacion),
      negocios: sortEntries(byNegocio).slice(0, 6),
      months: MONTH_LABELS.map((month, index) => ({
        name: month,
        value: byMonth[index],
      })),
    };
  }, [filteredSummary.rows]);

  const showLineasChart = selectedLinea === ALL_VALUE;
  const showEjecutivosChart = selectedEjecutivo === ALL_VALUE;
  const showNegociosChart = selectedNegocio === ALL_VALUE;
  const showSituacionesChart =
    showSituacionBreakdown && showSituacionFilter && selectedSituacion === ALL_VALUE;

  function buildDetailHref(scope: "lineas" | "clientes" | "ejecutivos") {
    const params = new URLSearchParams();
    params.set("scope", scope);
    if (selectedNegocio !== ALL_VALUE) params.set("negocio", selectedNegocio);
    if (selectedSituacion !== ALL_VALUE) params.set("situacion", selectedSituacion);
    if (selectedEjecutivo !== ALL_VALUE) params.set("ejecutivo", selectedEjecutivo);
    if (selectedLinea !== ALL_VALUE) params.set("linea", selectedLinea);
    if (selectedMonth !== MONTH_ALL_VALUE) params.set("mes", selectedMonth);
    return `${pathname}/detalle?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#07131f_0%,#17314b_42%,#86cf47_100%)] p-4 text-white shadow-[0_24px_80px_rgba(7,19,31,0.28)] sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_26%)]" />
        <div className="absolute inset-y-0 right-[-8rem] w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.32em] text-white/70">{eyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl xl:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/82">{description}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/85">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {summary.negocios.length} negocios
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {matrix.lines.length} lineas visibles
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {activeNegocioLabel}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {hasEtapaFilter
                  ? selectedEtapa === ALL_VALUE
                    ? "Todas las etapas"
                    : selectedEtapa
                  : "Sin filtro de etapa"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {showSituacionFilter
                  ? selectedSituacion === ALL_VALUE
                    ? "Todas las situaciones"
                    : selectedSituacion
                  : summary.situaciones[0] ?? "Sin situacion"}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {selectedEjecutivo === ALL_VALUE ? "Todos los ejecutivos" : selectedEjecutivo}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {selectedLinea === ALL_VALUE ? "Todas las lineas" : selectedLinea}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {selectedMonthLabel}
              </span>
            </div>
          </div>

          <div className="w-full min-w-0 rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-md xl:max-w-[36rem]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/65">Filtros</p>
                <p className="mt-1 text-lg font-semibold text-white">Cruza la matriz como necesites</p>
              </div>
              <div className="rounded-full border border-white/14 bg-black/15 px-3 py-1 text-xs text-white/78">
                {filteredSummary.rows.length} registros
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              <FilterField
                label="Negocio"
                value={selectedNegocio}
                onChange={(value) => {
                  setSelectedNegocio(value);
                  setSelectedLinea(ALL_VALUE);
                }}
                options={negocioOptions}
              />
              {hasEtapaFilter ? (
                <FilterField label="Etapa" value={selectedEtapa} onChange={setSelectedEtapa} options={etapaOptions} />
              ) : null}
              {showSituacionFilter ? (
                <FilterField label="Situacion" value={selectedSituacion} onChange={setSelectedSituacion} options={situacionOptions} />
              ) : null}
              <FilterField label="Ejecutivo" value={selectedEjecutivo} onChange={setSelectedEjecutivo} options={ejecutivoOptions} />
              <FilterField
                label="Linea"
                value={selectedLinea}
                onChange={setSelectedLinea}
                options={lineaOptions}
                disabled={selectedNegocio === ALL_VALUE}
              />
              <FilterField label="Mes" value={selectedMonth} onChange={setSelectedMonth} options={monthOptions} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title={totalLabel} value={matrix.grandTotal} icon={Layers3} tone="primary" />
        <KpiCard title="Lineas activas" value={matrix.lines.length} icon={PackageOpen} tone="success" format="number" />
        <KpiCard title="Registros visibles" value={filteredSummary.rows.length} icon={ListFilter} tone="warning" format="number" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {showLineasChart ? (
          <Card className="border-border/60 bg-[#07131f] text-white">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{selectedMonth === MONTH_ALL_VALUE ? "Top lineas" : "Top lineas del mes"}</CardTitle>
                <ChartScopeToggle href={buildDetailHref("lineas")} />
              </div>
            </CardHeader>
            <CardContent className="h-[320px] sm:h-[360px]">
              {analytics.lineasTop.length ? (
                <ResponsiveChartViewport>
                  <ChartContainer>
                    <BarChart data={analytics.lineasTop} layout="vertical" margin={{ left: 12, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatPen(Number(value))}
                        tick={CHART_TICK_STYLE}
                        axisLine={CHART_AXIS_STYLE}
                        tickLine={CHART_AXIS_STYLE}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={180}
                        tick={CHART_TICK_STYLE}
                        axisLine={CHART_AXIS_STYLE}
                        tickLine={CHART_AXIS_STYLE}
                      />
                      <Tooltip formatter={(value) => formatPen(Number(value ?? 0))} />
                      <Bar dataKey="value" fill="#86cf47" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ChartContainer>
                </ResponsiveChartViewport>
              ) : (
                <ChartEmpty label="No hay lineas para graficar." />
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/60 bg-[#07131f] text-white">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                {selectedMonth === MONTH_ALL_VALUE ? "Clientes con mayor compra" : "Clientes con mayor compra del mes"}
              </CardTitle>
              <ChartScopeToggle href={buildDetailHref("clientes")} />
            </div>
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[360px]">
            {analytics.clientesTop.length ? (
              <ResponsiveChartViewport>
                <ChartContainer>
                  <BarChart data={analytics.clientesTop} layout="vertical" margin={{ left: 12, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={(value) => formatPen(Number(value))}
                      tick={CHART_TICK_STYLE}
                      axisLine={CHART_AXIS_STYLE}
                      tickLine={CHART_AXIS_STYLE}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={180}
                      tick={CHART_TICK_STYLE}
                      axisLine={CHART_AXIS_STYLE}
                      tickLine={CHART_AXIS_STYLE}
                    />
                    <Tooltip formatter={(value) => formatPen(Number(value ?? 0))} />
                    <Bar dataKey="value" fill="#d97706" radius={[0, 10, 10, 0]} />
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartViewport>
            ) : (
              <ChartEmpty label="No hay clientes para graficar." />
            )}
          </CardContent>
        </Card>

        {showEjecutivosChart ? (
          <Card className="border-border/60 bg-[#07131f] text-white">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>
                  {selectedMonth === MONTH_ALL_VALUE ? "Top ejecutivos" : "Top ejecutivos del mes"}
                </CardTitle>
                <ChartScopeToggle href={buildDetailHref("ejecutivos")} />
              </div>
            </CardHeader>
            <CardContent className="h-[320px] sm:h-[360px]">
              {analytics.ejecutivosTop.length ? (
                <ResponsiveChartViewport>
                  <ChartContainer>
                    <BarChart data={analytics.ejecutivosTop} margin={{ left: 12, right: 16 }}>
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
                      <Bar dataKey="value" fill="#4fa3ff" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </ResponsiveChartViewport>
              ) : (
                <ChartEmpty label="No hay ejecutivos para graficar." />
              )}
            </CardContent>
          </Card>
        ) : null}

        {showNegociosChart ? (
          <Card className="border-border/60 bg-[#07131f] text-white">
            <CardHeader>
              <CardTitle>
                {selectedMonth === MONTH_ALL_VALUE ? "Negocios con mayor peso" : "Negocios del mes"}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] sm:h-[360px]">
              {analytics.negocios.length ? (
                <ResponsiveChartViewport>
                  <ChartContainer>
                    <BarChart data={analytics.negocios} margin={{ left: 12, right: 16 }}>
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
                      <Bar dataKey="value" fill="#f4a261" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </ResponsiveChartViewport>
              ) : (
                <ChartEmpty label="No hay negocios para graficar." />
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/60 bg-[#07131f] text-white">
          <CardHeader>
            <CardTitle>Comportamiento por mes</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] sm:h-[360px]">
            {analytics.months.some((entry) => entry.value > 0) ? (
              <ResponsiveChartViewport>
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
                    <Bar dataKey="value" fill="#0f766e" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </ResponsiveChartViewport>
            ) : (
              <ChartEmpty label="No hay meses con monto visible para comparar." />
            )}
          </CardContent>
        </Card>

        {showSituacionesChart ? (
          <Card className="border-border/60 bg-[#07131f] text-white xl:col-span-2">
            <CardHeader>
              <CardTitle>Distribucion por situacion</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px] sm:h-[360px]">
              {analytics.situaciones.length ? (
                <ResponsiveChartViewport minWidthClassName="min-w-[720px] lg:min-w-0">
                  <div className="grid h-full gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <ChartContainer>
                      <PieChart>
                        <Pie data={analytics.situaciones} dataKey="value" nameKey="name" outerRadius={164} innerRadius={78}>
                          {analytics.situaciones.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatPen(Number(value ?? 0))} />
                      </PieChart>
                    </ChartContainer>
                    <div className="overflow-y-auto pr-1">
                      <SituacionLegend items={analytics.situaciones} />
                    </div>
                  </div>
                </ResponsiveChartViewport>
              ) : (
                <ChartEmpty label="No hay situaciones para graficar." />
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>{cardTitle}</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Vista mensual consolidada por linea para la seleccion actual.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              {totalVisibleLabel}{" "}
              <span className="font-semibold text-foreground">{formatCurrency(matrix.grandTotal)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
            <div
              ref={topScrollRef}
              className="overflow-x-auto border-b border-border bg-muted/35"
              onScroll={() => syncHorizontalScroll("top")}
            >
              <div className="h-4 min-w-[1500px]" />
            </div>
            <div
              ref={bottomScrollRef}
              className="max-h-[70dvh] overflow-auto"
              onScroll={() => syncHorizontalScroll("bottom")}
            >
              <table className="min-w-[1500px] text-sm">
                <thead className="bg-[#44536c] text-white">
                  <tr>
                    <th className="sticky top-0 left-0 z-20 min-w-[220px] bg-[#44536c] px-4 py-4 text-left text-sm font-semibold shadow-[8px_0_20px_rgba(0,0,0,0.14)]">
                      Lineas
                    </th>
                    {matrix.months.map((month) => (
                      <th
                        key={month}
                        className="sticky top-0 z-10 min-w-[120px] bg-[#44536c] px-4 py-4 text-right text-sm font-semibold"
                      >
                        {month}
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 min-w-[140px] bg-[#44536c] px-4 py-4 text-right text-sm font-semibold">
                      Total general
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#061018] text-white">
                  {matrix.lines.length ? (
                    matrix.lines.map((line, rowIndex) => (
                      <tr
                        key={line.linea}
                        className={
                          rowIndex % 2 === 0
                            ? "border-b border-white/8 bg-black/80"
                            : "border-b border-white/8 bg-white/[0.03]"
                        }
                      >
                        <td className="sticky left-0 bg-inherit px-4 py-3.5 font-medium shadow-[8px_0_20px_rgba(0,0,0,0.14)]">
                          {line.linea}
                        </td>
                        {line.months.map((value, index) => (
                          <td key={`${line.linea}-${index}`} className="px-4 py-3.5 text-right tabular-nums">
                            {value ? formatPen(value) : "-"}
                          </td>
                        ))}
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                          {formatPen(line.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={14} className="px-4 py-12 text-center text-sm text-white/70">
                        {emptyLabel}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#d9d9d9] text-black">
                  <tr>
                    <td className="sticky bottom-0 left-0 z-20 bg-[#d9d9d9] px-4 py-4 font-semibold shadow-[8px_0_20px_rgba(0,0,0,0.08)]">
                      Total general
                    </td>
                    {matrix.monthTotals.map((value, index) => (
                      <td key={`total-${index}`} className="sticky bottom-0 z-10 bg-[#d9d9d9] px-4 py-4 text-right font-semibold tabular-nums">
                        {value ? formatPen(value) : "-"}
                      </td>
                    ))}
                    <td className="sticky bottom-0 z-10 bg-[#d9d9d9] px-4 py-4 text-right text-lg font-bold tabular-nums">
                      {formatPen(matrix.grandTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
