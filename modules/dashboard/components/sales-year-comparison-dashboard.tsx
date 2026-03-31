"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, Layers3, TrendingUp } from "lucide-react";

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

type YearAggregate = {
  year: number;
  ventasMonto: number;
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

export function SalesYearComparisonDashboard({
  summary,
}: {
  summary: SalesByClientSummary;
}) {
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);

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
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      return true;
    });
  }, [selectedLinea, selectedNegocio, summary.rows]);

  const yearlyComparison = useMemo(() => {
    const aggregates = new Map<number, YearAggregate>();

    for (const row of filteredRows) {
      const current = aggregates.get(row.importYear);

      if (current) {
        current.ventasMonto += row.ventasMonto;
        current.operaciones += 1;
        continue;
      }

      aggregates.set(row.importYear, {
        year: row.importYear,
        ventasMonto: row.ventasMonto,
        operaciones: 1,
      });
    }

    return [...aggregates.values()].sort((a, b) => a.year - b.year);
  }, [filteredRows]);

  const totalVentas = yearlyComparison.reduce((sum, row) => sum + row.ventasMonto, 0);
  const bestYear = yearlyComparison.reduce<YearAggregate | null>(
    (best, row) => {
      if (!best || row.ventasMonto > best.ventasMonto) return row;
      return best;
    },
    null,
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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#172033_0%,#274060_48%,#b7d1e6_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              Dashboard comparativo
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Ventas por año
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Compara ventas anuales usando la data cargada en JSON. La línea
              solo se habilita después de elegir un negocio.
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-2">
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
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title="Ventas filtradas" value={totalVentas} icon={TrendingUp} tone="primary" />
        <KpiCard
          title="Años comparados"
          value={yearlyComparison.length}
          icon={CalendarRange}
          tone="success"
          format="number"
        />
        <KpiCard
          title="Mejor año"
          value={bestYear?.ventasMonto ?? 0}
          icon={Layers3}
          tone="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Comparativo anual de ventas</CardTitle>
          </CardHeader>
          <CardContent className="h-[420px]">
            {yearlyComparison.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyComparison} margin={{ left: 12, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="ventasMonto" fill="#274060" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed text-sm text-muted-foreground">
                No hay datos para el negocio o la linea seleccionada.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lectura rapida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-2xl border bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Negocio activo
              </p>
              <p className="mt-2 text-lg font-semibold">
                {selectedNegocio === ALL_VALUE ? "Todos" : selectedNegocio}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Linea activa
              </p>
              <p className="mt-2 text-lg font-semibold">
                {selectedLinea === ALL_VALUE ? "Todas" : selectedLinea}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Año con mayor venta
              </p>
              <p className="mt-2 text-lg font-semibold">
                {bestYear ? bestYear.year : "Sin datos"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {bestYear ? formatCurrency(bestYear.ventasMonto) : "Ajusta los filtros"}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Detalle anual</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableElement>
              <TableHead>
                <tr>
                  <TableHeaderCell>Año</TableHeaderCell>
                  <TableHeaderCell className="text-right">Ventas</TableHeaderCell>
                  <TableHeaderCell className="text-right">Registros</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {yearlyComparison.length ? (
                  yearlyComparison.map((row) => (
                    <TableRow key={row.year}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.ventasMonto)}</TableCell>
                      <TableCell className="text-right">{row.operaciones}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay comparativos anuales para mostrar.
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
