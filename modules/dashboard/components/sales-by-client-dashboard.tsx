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
} from "recharts";
import { BarChart3, Filter, Users } from "lucide-react";

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
import type { SalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";

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

type AbcClass = "A" | "B" | "C";

type ClientAggregate = {
  cliente: string;
  ventasMonto: number;
  operaciones: number;
  abcClass: AbcClass;
  salesShare: number;
  cumulativeShare: number;
};

function getAbcClass(cumulativeShare: number): AbcClass {
  if (cumulativeShare <= 80) return "A";
  if (cumulativeShare <= 95) return "B";
  return "C";
}

function getAbcBadgeClass(value: AbcClass) {
  if (value === "A") return "bg-emerald-500/15 text-emerald-700";
  if (value === "B") return "bg-amber-500/15 text-amber-700";
  return "bg-slate-500/15 text-slate-700";
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
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        value={value}
        onChange={(event) => onChange(event.target.value)}
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

export function SalesByClientDashboard({
  summary,
}: {
  summary: SalesByClientSummary;
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

  const topClients = clientRanking.slice(0, 10);
  const totalVentas = clientRanking.reduce((sum, row) => sum + row.ventasMonto, 0);
  const totalOperaciones = filteredRows.length;

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

  const negocioOptions = useMemo(
    () => [
      { label: "Todos los negocios", value: ALL_VALUE },
      ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
    ],
    [summary.negocios],
  );

  const availableLineas = useMemo(() => {
    if (selectedNegocio === ALL_VALUE) return summary.lineas;

    const lineas = new Set<string>();

    for (const row of summary.rows) {
      if (row.negocio === selectedNegocio && row.linea) {
        lineas.add(row.linea);
      }
    }

    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedNegocio, summary.lineas, summary.rows]);

  const lineaOptions = useMemo(
    () => [
      { label: "Todas las lineas", value: ALL_VALUE },
      ...availableLineas.map((linea) => ({ label: linea, value: linea })),
    ],
    [availableLineas],
  );

  const yearOptions = useMemo(
    () => [
      { label: "Todos los Años", value: ALL_VALUE },
      ...summary.years.map((year) => ({ label: String(year), value: String(year) })),
    ],
    [summary.years],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#08263d_0%,#0f3d5e_48%,#7eb6da_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Dashboard comercial
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Ventas por cliente
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Ranking de clientes con clasificacion ABC sobre la data cargada en JSON, con filtros
              por Año, negocio y linea.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-3">
            <FilterSelect
              label="Año"
              value={selectedYear}
              options={yearOptions}
              onChange={setSelectedYear}
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
              label="Linea"
              value={selectedLinea}
              options={lineaOptions}
              onChange={setSelectedLinea}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title="Ventas visibles" value={totalVentas} icon={BarChart3} tone="primary" />
        <KpiCard title="Clientes clase A" value={abcCounts.A} icon={Users} tone="success" format="number" />
        <KpiCard title="Registros filtrados" value={totalOperaciones} icon={Filter} tone="warning" format="number" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 clientes por ventas</CardTitle>
          </CardHeader>
          <CardContent className="h-[430px]">
            {topClients.length ? (
              <ChartContainer>
                <BarChart data={topClients} layout="vertical" margin={{ left: 24, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis
                    type="category"
                    dataKey="cliente"
                    width={180}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    cursor={{ fill: "rgba(15,61,94,0.08)" }}
                  />
                  <Bar dataKey="ventasMonto" radius={[0, 10, 10, 0]}>
                    {topClients.map((entry, index) => (
                      <Cell
                        key={entry.cliente}
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
            <CardTitle>Resumen ABC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientRanking.length ? (
              (["A", "B", "C"] as const).map((abcClass) => {
                const count = abcCounts[abcClass];
                const sales = clientRanking
                  .filter((row) => row.abcClass === abcClass)
                  .reduce((sum, row) => sum + row.ventasMonto, 0);

                return (
                  <div key={abcClass} className="rounded-2xl border bg-muted/25 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Clase {abcClass}
                    </p>
                    <p className="mt-2 text-base font-semibold">{count} clientes</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Venta acumulada de la clase
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-tight">
                      {formatCurrency(sales)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Ajusta los filtros para encontrar clientes con ventas.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del top 10 con clasificacion ABC</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableElement>
              <TableHead>
                <tr>
                  <TableHeaderCell>#</TableHeaderCell>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>ABC</TableHeaderCell>
                  <TableHeaderCell className="text-right">Ventas</TableHeaderCell>
                  <TableHeaderCell className="text-right">% Part.</TableHeaderCell>
                  <TableHeaderCell className="text-right">% Acum.</TableHeaderCell>
                  <TableHeaderCell className="text-right">Registros</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {topClients.length ? (
                  topClients.map((row, index) => (
                    <TableRow key={row.cliente}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.cliente}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getAbcBadgeClass(row.abcClass)}`}>
                          {row.abcClass}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.ventasMonto)}</TableCell>
                      <TableCell className="text-right">{row.salesShare.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{row.cumulativeShare.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{row.operaciones}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay clientes para mostrar con los filtros actuales.
                    </td>
                  </tr>
                )}
              </TableBody>
            </TableElement>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
