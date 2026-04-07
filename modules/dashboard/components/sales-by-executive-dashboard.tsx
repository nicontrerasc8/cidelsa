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
} from "recharts";
import { Filter, UserRound, UsersRound } from "lucide-react";

import { ChartContainer } from "@/components/charts/chart-container";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { EXECUTIVE_MONTH_LABELS } from "@/modules/dashboard/lib/sales-by-executive";
import type { SalesByExecutiveSummary } from "@/modules/dashboard/services/sales-by-executive";

const ALL_VALUE = "__all__";
const CHART_COLORS = [
  "#0f3d5e",
  "#145b8a",
  "#1c78b6",
  "#3298d6",
  "#5cb3e6",
  "#7ec7ef",
  "#9ad8f5",
  "#b3e5f8",
  "#d0eefb",
  "#e5f6fd",
] as const;
const CHART_TICK_STYLE = { fill: "#ffffff", fontSize: 13 } as const;
const CHART_AXIS_STYLE = { stroke: "rgba(255, 255, 255, 0.28)" } as const;

type ExecutiveLineAggregate = {
  ejecutivo: string;
  linea: string | null;
  label: string;
  ventasMonto: number;
};

type ExecutiveSummaryCard = {
  ejecutivo: string;
  totalVentas: number;
  bestLinea: string;
  bestLineaVentas: number;
  operaciones: number;
};

type MonthlyComparisonRow = {
  month: string;
} & Record<string, string | number>;

function FilterSelect({
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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

export function SalesByExecutiveDashboard({
  summary,
}: {
  summary: SalesByExecutiveSummary;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "comparativos">("overview");
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);
  const [selectedEjecutivo, setSelectedEjecutivo] = useState<string>(ALL_VALUE);
  const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<string>(ALL_VALUE);

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

  const rowsForMonthlyComparison = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
      return true;
    });
  }, [selectedEjecutivo, selectedLinea, selectedNegocio, summary.rows]);

  const executiveCards = useMemo(() => {
    const executiveMap = new Map<
      string,
      { totalVentas: number; operaciones: number; lineas: Map<string, number> }
    >();

    for (const row of filteredRows) {
      const current =
        executiveMap.get(row.ejecutivo) ??
        {
          totalVentas: 0,
          operaciones: 0,
          lineas: new Map<string, number>(),
        };

      current.totalVentas += row.ventasMonto;
      current.operaciones += 1;

      const linea = row.linea ?? "Sin línea";
      current.lineas.set(linea, (current.lineas.get(linea) ?? 0) + row.ventasMonto);
      executiveMap.set(row.ejecutivo, current);
    }

    return [...executiveMap.entries()]
      .map(([ejecutivo, value]) => {
        const bestLineaEntry =
          [...value.lineas.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin línea", 0];

        return {
          ejecutivo,
          totalVentas: value.totalVentas,
          bestLinea: bestLineaEntry[0],
          bestLineaVentas: bestLineaEntry[1],
          operaciones: value.operaciones,
        } satisfies ExecutiveSummaryCard;
      })
      .sort((a, b) => b.totalVentas - a.totalVentas);
  }, [filteredRows]);

  const executiveLineRanking = useMemo(() => {
    const pairMap = new Map<string, ExecutiveLineAggregate>();

    for (const row of filteredRows) {
      const linea = row.linea ?? "Sin línea";
      const key = `${row.ejecutivo}__${linea}`;
      const current = pairMap.get(key);

      if (current) {
        current.ventasMonto += row.ventasMonto;
        continue;
      }

      pairMap.set(key, {
        ejecutivo: row.ejecutivo,
        linea,
        label: `${row.ejecutivo} | ${linea}`,
        ventasMonto: row.ventasMonto,
      });
    }

    return [...pairMap.values()].sort((a, b) => b.ventasMonto - a.ventasMonto).slice(0, 12);
  }, [filteredRows]);

  const activeExecutive =
    selectedEjecutivo !== ALL_VALUE
      ? selectedEjecutivo
      : executiveCards[0]?.ejecutivo ?? null;

  const activeExecutiveRows = useMemo(() => {
    if (!activeExecutive) return [];
    return rowsForMonthlyComparison.filter((row) => row.ejecutivo === activeExecutive);
  }, [activeExecutive, rowsForMonthlyComparison]);

  const monthlyComparisonYears = useMemo(() => {
    const years = new Set<number>();

    for (const row of activeExecutiveRows) {
      if (row.importYear === null) continue;
      years.add(row.importYear);
    }

    return [...years].sort((a, b) => a - b);
  }, [activeExecutiveRows]);

  const visibleMonthlyYears = useMemo(() => {
    if (
      selectedMonthlyYear !== ALL_VALUE &&
      monthlyComparisonYears.includes(Number(selectedMonthlyYear))
    ) {
      return [Number(selectedMonthlyYear)];
    }
    return monthlyComparisonYears;
  }, [monthlyComparisonYears, selectedMonthlyYear]);

  const monthlyComparison = useMemo(() => {
    const monthYearValues = new Map<number, number[]>();

    for (const year of visibleMonthlyYears) {
      monthYearValues.set(year, new Array<number>(12).fill(0));
    }

    for (const row of activeExecutiveRows) {
      if (row.monthIndex === null || row.importYear === null) continue;
      if (!monthYearValues.has(row.importYear)) continue;
      monthYearValues.get(row.importYear)![row.monthIndex] += row.ventasMonto;
    }

    return EXECUTIVE_MONTH_LABELS.map((month, index) => {
      const values: MonthlyComparisonRow = { month };

      for (const year of visibleMonthlyYears) {
        values[String(year)] = monthYearValues.get(year)?.[index] ?? 0;
      }

      return values;
    });
  }, [activeExecutiveRows, visibleMonthlyYears]);

  const executiveYearComparison = useMemo(() => {
    const years =
      selectedYear !== ALL_VALUE
        ? [Number(selectedYear)]
        : [...summary.years].sort((a, b) => a - b);

    const executiveMap = new Map<
      string,
      {
        years: Map<number, number>;
        totalVentas: number;
      }
    >();

    for (const row of filteredRows) {
      if (row.importYear === null) continue;

      const current =
        executiveMap.get(row.ejecutivo) ??
        {
          years: new Map<number, number>(),
          totalVentas: 0,
        };

      current.years.set(
        row.importYear,
        (current.years.get(row.importYear) ?? 0) + row.ventasMonto,
      );
      current.totalVentas += row.ventasMonto;
      executiveMap.set(row.ejecutivo, current);
    }

    const table = [...executiveMap.entries()]
      .map(([ejecutivo, value]) => ({
        ejecutivo,
        totalVentas: value.totalVentas,
        years: years.map((year) => ({
          year,
          ventasMonto: value.years.get(year) ?? 0,
        })),
      }))
      .sort((a, b) => b.totalVentas - a.totalVentas);

    return {
      years,
      table,
    };
  }, [filteredRows, selectedYear, summary.years]);

  const totalVentas = filteredRows.reduce((sum, row) => sum + row.ventasMonto, 0);

  const yearOptions = useMemo(
    () => [
      { label: "Todos los años", value: ALL_VALUE },
      ...summary.years.map((year) => ({ label: String(year), value: String(year) })),
    ],
    [summary.years],
  );

  const monthOptions = useMemo(
    () => [
      { label: "Todos los meses", value: ALL_VALUE },
      ...EXECUTIVE_MONTH_LABELS.map((month, index) => ({
        label: month,
        value: String(index),
      })),
    ],
    [],
  );

  const negocioOptions = useMemo(
    () => [
      { label: "Todos los negocios", value: ALL_VALUE },
      ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
    ],
    [summary.negocios],
  );

  const lineaOptions = useMemo(
    () => [
      { label: "Todas las líneas", value: ALL_VALUE },
      ...availableLineas.map((linea) => ({ label: linea, value: linea })),
    ],
    [availableLineas],
  );

  const availableExecutives = useMemo(() => {
    const executives = new Set<string>();

    for (const row of rowsMatchingBaseFilters) {
      executives.add(row.ejecutivo);
    }

    return [...executives].sort((a, b) => a.localeCompare(b));
  }, [rowsMatchingBaseFilters]);

  const ejecutivoOptions = useMemo(
    () => [
      { label: "Todos los ejecutivos", value: ALL_VALUE },
      ...availableExecutives.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo })),
    ],
    [availableExecutives],
  );

  const monthlyYearOptions = useMemo(
    () => [
      { label: "Todos los años", value: ALL_VALUE },
      ...monthlyComparisonYears.map((year) => ({ label: String(year), value: String(year) })),
    ],
    [monthlyComparisonYears],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#0b1f33_0%,#17456d_45%,#7fc8ff_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Dashboard ejecutivos
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Ventas por ejecutivo
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Analiza qué ejecutivos venden más, en qué línea concentran sus
              ventas y cómo evolucionan usando el año que viene en cada fila del
              JSON AX.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect
              label="Año"
              value={selectedYear}
              options={yearOptions}
              onChange={setSelectedYear}
            />
            <FilterSelect
              label="Mes"
              value={selectedMonth}
              options={monthOptions}
              onChange={setSelectedMonth}
            />
            <FilterSelect
              label="Negocio"
              value={selectedNegocio}
              options={negocioOptions}
              onChange={(value) => {
                setSelectedNegocio(value);
                setSelectedLinea(ALL_VALUE);
              }}
            />
            <FilterSelect
              label="Línea"
              value={selectedLinea}
              options={lineaOptions}
              onChange={setSelectedLinea}
              disabled={selectedNegocio === ALL_VALUE}
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

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title="Ventas filtradas" value={totalVentas} icon={UsersRound} tone="primary" />
        <KpiCard
          title="Ejecutivos visibles"
          value={executiveCards.length}
          icon={UserRound}
          tone="success"
          format="number"
        />
        <KpiCard
          title="Registros considerados"
          value={filteredRows.length}
          icon={Filter}
          tone="warning"
          format="number"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Vista general
        </button>
        <button
          type="button"
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "comparativos"
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-background text-foreground hover:bg-muted"
          }`}
          onClick={() => setActiveTab("comparativos")}
        >
          Comparativos
        </button>
      </div>

      {activeTab === "overview" ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Qué ejecutivo vende más y en qué línea</CardTitle>
              </CardHeader>
              <CardContent className="h-[430px]">
                {executiveLineRanking.length ? (
                  <ChartContainer>
                    <BarChart
                      data={executiveLineRanking}
                      layout="vertical"
                      margin={{ left: 24, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => formatCurrency(Number(value))}
                        tick={CHART_TICK_STYLE}
                        axisLine={CHART_AXIS_STYLE}
                        tickLine={CHART_AXIS_STYLE}
                      />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={220}
                        tick={CHART_TICK_STYLE}
                        axisLine={CHART_AXIS_STYLE}
                        tickLine={CHART_AXIS_STYLE}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload as
                            | ExecutiveLineAggregate
                            | undefined;
                          return item ? `${item.ejecutivo} | ${item.linea ?? "Sin línea"}` : "";
                        }}
                      />
                      <Bar dataKey="ventasMonto" radius={[0, 10, 10, 0]}>
                        {executiveLineRanking.map((entry, index) => (
                          <Cell
                            key={`${entry.ejecutivo}-${entry.linea}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                    No hay datos para los filtros seleccionados.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen por ejecutivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {executiveCards.slice(0, 3).map((card) => (
                  <div key={card.ejecutivo} className="rounded-2xl border bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      {card.ejecutivo}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">
                      {formatCurrency(card.totalVentas)}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Mejor línea:{" "}
                      <span className="font-medium text-foreground">{card.bestLinea}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {card.operaciones} registros | {formatCurrency(card.bestLineaVentas)} en su
                      línea principal
                    </p>
                  </div>
                ))}
                {!executiveCards.length ? (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    Ajusta los filtros para encontrar ejecutivos con ventas.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Detalle por ejecutivo y línea</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableElement>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>#</TableHeaderCell>
                      <TableHeaderCell>Ejecutivo</TableHeaderCell>
                      <TableHeaderCell>Línea</TableHeaderCell>
                      <TableHeaderCell className="text-right">Ventas</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {executiveLineRanking.length ? (
                      executiveLineRanking.map((row, index) => (
                        <TableRow key={`${row.ejecutivo}-${row.linea}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{row.ejecutivo}</TableCell>
                          <TableCell>{row.linea ?? "Sin línea"}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(row.ventasMonto)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No hay combinaciones de ejecutivo y línea para mostrar.
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <CardTitle>Evolución mensual del ejecutivo activo</CardTitle>
              <div className="w-full lg:w-56">
                <FilterSelect
                  label="Año del comparativo"
                  value={selectedMonthlyYear}
                  options={monthlyYearOptions}
                  onChange={setSelectedMonthlyYear}
                  disabled={!monthlyComparisonYears.length}
                />
              </div>
            </CardHeader>
            <CardContent className="h-[430px]">
              {activeExecutive && activeExecutiveRows.length && visibleMonthlyYears.length ? (
                <ChartContainer>
                  <BarChart data={monthlyComparison} margin={{ left: 12, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="month"
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={72}
                      tick={CHART_TICK_STYLE}
                      axisLine={CHART_AXIS_STYLE}
                      tickLine={CHART_AXIS_STYLE}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(Number(value))}
                      tick={CHART_TICK_STYLE}
                      axisLine={CHART_AXIS_STYLE}
                      tickLine={CHART_AXIS_STYLE}
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                    <Legend />
                    {visibleMonthlyYears.map((year, index) => (
                      <Bar
                        key={year}
                        dataKey={String(year)}
                        name={String(year)}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        radius={[10, 10, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                  No hay suficiente data para comparar al ejecutivo seleccionado.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparativo anual entre ejecutivos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableElement>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Ejecutivo</TableHeaderCell>
                      {executiveYearComparison.years.map((year) => (
                        <TableHeaderCell key={year} className="text-right">
                          {year}
                        </TableHeaderCell>
                      ))}
                      <TableHeaderCell className="text-right">Total</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {executiveYearComparison.table.length ? (
                      executiveYearComparison.table.map((row) => (
                        <TableRow key={row.ejecutivo}>
                          <TableCell className="font-medium">{row.ejecutivo}</TableCell>
                          {row.years.map((year) => (
                            <TableCell
                              key={`${row.ejecutivo}-${year.year}`}
                              className="text-right"
                            >
                              {formatCurrency(year.ventasMonto)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(row.totalVentas)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={executiveYearComparison.years.length + 2}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No hay comparativos anuales para mostrar con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
