"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Filter, UserRound, UsersRound } from "lucide-react";

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

type ExecutiveLineAggregate = {
  ejecutivo: string;
  linea: string | null;
  ventasMonto: number;
};

type ExecutiveSummaryCard = {
  ejecutivo: string;
  totalVentas: number;
  bestLinea: string;
  bestLineaVentas: number;
  operaciones: number;
};

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
        className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
      if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
      if (selectedMonth !== ALL_VALUE && row.monthIndex !== Number(selectedMonth)) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
      return true;
    });
  }, [
    selectedEjecutivo,
    selectedLinea,
    selectedMonth,
    selectedNegocio,
    selectedYear,
    summary.rows,
  ]);

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

      const linea = row.linea ?? "Sin linea";
      current.lineas.set(linea, (current.lineas.get(linea) ?? 0) + row.ventasMonto);
      executiveMap.set(row.ejecutivo, current);
    }

    return [...executiveMap.entries()]
      .map(([ejecutivo, value]) => {
        const bestLineaEntry =
          [...value.lineas.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sin linea", 0];

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
      const linea = row.linea ?? "Sin linea";
      const key = `${row.ejecutivo}__${linea}`;
      const current = pairMap.get(key);

      if (current) {
        current.ventasMonto += row.ventasMonto;
        continue;
      }

      pairMap.set(key, {
        ejecutivo: row.ejecutivo,
        linea,
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
    return filteredRows.filter((row) => row.ejecutivo === activeExecutive);
  }, [activeExecutive, filteredRows]);

  const monthlyComparison = useMemo(() => {
    const monthValues = new Array<number>(12).fill(0);

    for (const row of activeExecutiveRows) {
      if (row.monthIndex === null) continue;
      monthValues[row.monthIndex] += row.ventasMonto;
    }

    return EXECUTIVE_MONTH_LABELS.map((month, index) => ({
      month,
      ventasMonto: monthValues[index],
    }));
  }, [activeExecutiveRows]);

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
      { label: "Todas las lineas", value: ALL_VALUE },
      ...availableLineas.map((linea) => ({ label: linea, value: linea })),
    ],
    [availableLineas],
  );

  const availableExecutives = useMemo(() => {
    const executives = new Set<string>();
    for (const row of filteredRows) {
      executives.add(row.ejecutivo);
    }
    return [...executives].sort((a, b) => a.localeCompare(b));
  }, [filteredRows]);

  const ejecutivoOptions = useMemo(
    () => [
      { label: "Todos los ejecutivos", value: ALL_VALUE },
      ...availableExecutives.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo })),
    ],
    [availableExecutives],
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
              Analiza qué ejecutivos venden más, en qué línea concentran sus ventas
              y cómo evolucionan con filtros consistentes.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="Año" value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
            <FilterSelect label="Mes" value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />
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
              label="Linea"
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
        <KpiCard title="Ejecutivos visibles" value={executiveCards.length} icon={UserRound} tone="success" format="number" />
        <KpiCard title="Registros considerados" value={filteredRows.length} icon={Filter} tone="warning" format="number" />
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
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={executiveLineRanking} layout="vertical" margin={{ left: 24, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value))} />
                      <YAxis type="category" dataKey="ejecutivo" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                        labelFormatter={(_, payload) => {
                          const item = payload?.[0]?.payload as ExecutiveLineAggregate | undefined;
                          return item ? `${item.ejecutivo} | ${item.linea ?? "Sin linea"}` : "";
                        }}
                      />
                      <Bar dataKey="ventasMonto" radius={[0, 10, 10, 0]}>
                        {executiveLineRanking.map((entry, index) => (
                          <Cell key={`${entry.ejecutivo}-${entry.linea}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                    No hay ventas de ejecutivos para los filtros seleccionados.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top ejecutivos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {executiveCards.slice(0, 5).map((row, index) => (
                  <div key={row.ejecutivo} className="rounded-2xl border bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Puesto {index + 1}
                    </p>
                    <p className="mt-2 text-base font-semibold">{row.ejecutivo}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Línea líder: {row.bestLinea}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatCurrency(row.bestLineaVentas)} en {row.bestLinea}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight">
                      {formatCurrency(row.totalVentas)}
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
              <CardTitle>Detalle de ejecutivos y su línea más fuerte</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableElement>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>#</TableHeaderCell>
                      <TableHeaderCell>Ejecutivo</TableHeaderCell>
                      <TableHeaderCell>Línea líder</TableHeaderCell>
                      <TableHeaderCell className="text-right">Ventas línea líder</TableHeaderCell>
                      <TableHeaderCell className="text-right">Ventas totales</TableHeaderCell>
                      <TableHeaderCell className="text-right">Registros</TableHeaderCell>
                    </tr>
                  </TableHead>
                  <TableBody>
                    {executiveCards.length ? (
                      executiveCards.map((row, index) => (
                        <TableRow key={row.ejecutivo}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">{row.ejecutivo}</TableCell>
                          <TableCell>{row.bestLinea}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.bestLineaVentas)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(row.totalVentas)}</TableCell>
                          <TableCell className="text-right">{row.operaciones}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No hay ejecutivos para mostrar.
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
        <>
          <section className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ventas anuales por ejecutivo</CardTitle>
              </CardHeader>
              <CardContent className="h-[360px]">
                {executiveCards.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={executiveCards.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="ejecutivo"
                        tick={{ fontSize: 11 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                      <Bar dataKey="totalVentas" fill="#145b8a" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                    No hay ventas anuales para los filtros seleccionados.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Ventas mensuales del ejecutivo {activeExecutive ? activeExecutive : "seleccionado"}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[360px]">
                {monthlyComparison.some((row) => row.ventasMonto > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyComparison}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                      <Bar dataKey="ventasMonto" fill="#3298d6" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                    No hay comparativo mensual para el ejecutivo activo.
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Tabla anual de ejecutivos</CardTitle>
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
                          {row.years.map((yearItem) => (
                            <TableCell key={`${row.ejecutivo}-${yearItem.year}`} className="text-right">
                              {yearItem.ventasMonto ? formatCurrency(yearItem.ventasMonto) : "-"}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">{formatCurrency(row.totalVentas)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={executiveYearComparison.years.length + 2}
                          className="px-4 py-10 text-center text-sm text-muted-foreground"
                        >
                          No hay tabla anual para mostrar con los filtros actuales.
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </TableElement>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
