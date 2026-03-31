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
import { Building2, Filter, ReceiptText } from "lucide-react";

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
import type { BillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";

const ALL_VALUE = "__all__";
const CHART_COLORS = [
  "#1f3b5c",
  "#29567f",
  "#3471a3",
  "#4388bd",
  "#5ea3d1",
  "#7cbbe0",
  "#9bd0ea",
  "#b8e2f3",
] as const;

type BillingAggregate = {
  linea: string;
  ventasMonto: number;
  operaciones: number;
};

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

export function BillingByLineDashboard({
  summary,
}: {
  summary: BillingByLineSummary;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);

  const filteredRows = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      return true;
    });
  }, [selectedNegocio, selectedYear, summary.rows]);

  const billingByLine = useMemo(() => {
    const aggregates = new Map<string, BillingAggregate>();

    for (const row of filteredRows) {
      const current = aggregates.get(row.linea);

      if (current) {
        current.ventasMonto += row.ventasMonto;
        current.operaciones += 1;
        continue;
      }

      aggregates.set(row.linea, {
        linea: row.linea,
        ventasMonto: row.ventasMonto,
        operaciones: 1,
      });
    }

    return [...aggregates.values()].sort((a, b) => b.ventasMonto - a.ventasMonto);
  }, [filteredRows]);

  const totalFacturado = billingByLine.reduce((sum, row) => sum + row.ventasMonto, 0);

  const yearOptions = useMemo(
    () => [
      { label: "Todos los años", value: ALL_VALUE },
      ...summary.years.map((year) => ({ label: String(year), value: String(year) })),
    ],
    [summary.years],
  );

  const negocioOptions = useMemo(
    () => [
      { label: "Todos los negocios", value: ALL_VALUE },
      ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
    ],
    [summary.negocios],
  );

  const chartData = billingByLine.slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#10213d_0%,#1d3f6e_48%,#9fd4ff_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Dashboard facturación
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Facturación por línea
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Se consideran solo filas con `Situación = Facturado` para analizar
              la facturación acumulada por línea.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-2">
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
              onChange={setSelectedNegocio}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title="Total facturado" value={totalFacturado} icon={ReceiptText} tone="primary" />
        <KpiCard title="Líneas facturadas" value={billingByLine.length} icon={Building2} tone="success" format="number" />
        <KpiCard title="Registros facturados" value={filteredRows.length} icon={Filter} tone="warning" format="number" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top líneas facturadas</CardTitle>
          </CardHeader>
          <CardContent className="h-[430px]">
            {chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 24, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value))} />
                  <YAxis type="category" dataKey="linea" width={180} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="ventasMonto" radius={[0, 10, 10, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.linea}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                No hay facturación para los filtros seleccionados.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lectura rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {billingByLine.slice(0, 3).map((row, index) => (
              <div key={row.linea} className="rounded-2xl border bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Puesto {index + 1}
                </p>
                <p className="mt-2 text-base font-semibold">{row.linea}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {row.operaciones} registros facturados
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {formatCurrency(row.ventasMonto)}
                </p>
              </div>
            ))}
            {!billingByLine.length ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Ajusta los filtros para encontrar líneas facturadas.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de facturación por línea</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableElement>
              <TableHead>
                <tr>
                  <TableHeaderCell>#</TableHeaderCell>
                  <TableHeaderCell>Línea</TableHeaderCell>
                  <TableHeaderCell className="text-right">Facturación</TableHeaderCell>
                  <TableHeaderCell className="text-right">Registros</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {billingByLine.length ? (
                  billingByLine.map((row, index) => (
                    <TableRow key={row.linea}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.linea}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.ventasMonto)}</TableCell>
                      <TableCell className="text-right">{row.operaciones}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay líneas facturadas para mostrar.
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
