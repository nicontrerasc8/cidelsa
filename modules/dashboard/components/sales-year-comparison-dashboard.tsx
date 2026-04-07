"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange, Layers3, TrendingUp } from "lucide-react";

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
  className,
  labelClassName,
  selectClassName,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  selectClassName?: string;
}) {
  return (
    <div className={className}>
      <Label className={labelClassName}>{label}</Label>
      <select
        className={`mt-2 flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${selectClassName ?? ""}`}
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

  const availableEjecutivos = useMemo(() => {
    const ejecutivos = new Set<string>();

    for (const row of summary.rows) {
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) continue;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) continue;
      if (row.ejecutivo) ejecutivos.add(row.ejecutivo);
    }

    return [...ejecutivos].sort((a, b) => a.localeCompare(b));
  }, [selectedLinea, selectedNegocio, summary.rows]);

  const filteredRows = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      if (selectedEjecutivo !== ALL_VALUE && row.ejecutivo !== selectedEjecutivo) return false;
      return true;
    });
  }, [selectedEjecutivo, selectedLinea, selectedNegocio, summary.rows]);

  const yearlyComparison = useMemo(() => {
    const aggregates = new Map<number, YearAggregate>();

    for (const row of filteredRows) {
      if (row.importYear === null) continue;
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

  const ejecutivoOptions = useMemo(
    () => [
      { label: "Todos los ejecutivos", value: ALL_VALUE },
      ...availableEjecutivos.map((ejecutivo) => ({ label: ejecutivo, value: ejecutivo })),
    ],
    [availableEjecutivos],
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
      
          </div>

          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur md:grid-cols-2 xl:grid-cols-3">
            <FilterSelect
              label="Negocio"
              value={selectedNegocio}
              options={negocioOptions}
              onChange={(value) => {
                setSelectedNegocio(value);
                setSelectedLinea(ALL_VALUE);
                setSelectedEjecutivo(ALL_VALUE);
              }}
            />
            <FilterSelect
              label="Línea"
              value={selectedLinea}
              options={lineaOptions}
              onChange={(value) => {
                setSelectedLinea(value);
                setSelectedEjecutivo(ALL_VALUE);
              }}
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
        <Card className="border-white/10 bg-[linear-gradient(160deg,#0f172a_0%,#13233f_52%,#1e3a5f_100%)] text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <CardTitle className="text-white">Comparativo anual de ventas</CardTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[24rem]">
              <FilterSelect
                className="space-y-0"
                label="Negocio"
                labelClassName="text-xs font-medium uppercase tracking-[0.18em] text-white/72"
                selectClassName="border-white/15 bg-white/10 text-white focus-visible:ring-white/40"
                value={selectedNegocio}
                options={negocioOptions}
                onChange={(value) => {
                  setSelectedNegocio(value);
                  setSelectedLinea(ALL_VALUE);
                  setSelectedEjecutivo(ALL_VALUE);
                }}
              />
              <FilterSelect
                className="space-y-0"
                label="Linea"
                labelClassName="text-xs font-medium uppercase tracking-[0.18em] text-white/72"
                selectClassName="border-white/15 bg-white/10 text-white focus-visible:ring-white/40"
                value={selectedLinea}
                options={lineaOptions}
                onChange={(value) => {
                  setSelectedLinea(value);
                  setSelectedEjecutivo(ALL_VALUE);
                }}
                disabled={selectedNegocio === ALL_VALUE}
              />
            </div>
          </CardHeader>
          <CardContent className="h-[420px]">
            {yearlyComparison.length ? (
              <ChartContainer className="rounded-[1.25rem] bg-white/5 p-2">
                <BarChart data={yearlyComparison} margin={{ left: 12, right: 16 }}>
                  <defs>
                    <linearGradient id="salesYearBarFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7dd3fc" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.92)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(255,255,255,0.92)", fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.08)" }}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "16px",
                      color: "#ffffff",
                    }}
                    itemStyle={{ color: "#ffffff" }}
                    labelStyle={{ color: "rgba(255,255,255,0.72)" }}
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                  />
                  <Bar dataKey="ventasMonto" fill="url(#salesYearBarFill)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 text-sm text-white/80">
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
                Ejecutivo activo
              </p>
              <p className="mt-2 text-lg font-semibold">
                {selectedEjecutivo === ALL_VALUE ? "Todos" : selectedEjecutivo}
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
