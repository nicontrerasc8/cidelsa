"use client";

import { useMemo, useState } from "react";
import { BarChart3, Filter, PackageOpen } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { VariationsSummary } from "@/modules/dashboard/services/variations";

const ALL_VALUE = "__all__";

type VariationAggregate = {
  label: string;
  previousReal: number;
  currentBudget: number;
  currentReal: number;
  grossMargin: number | null;
};

type VariationTotals = {
  previousReal: number;
  currentBudget: number;
  currentReal: number;
  grossMargin: number | null;
};

function formatPen(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value)}%`;
}

function calculateVariationPercent(currentReal: number, previousReal: number) {
  if (!previousReal) return null;
  return ((currentReal - previousReal) / previousReal) * 100;
}

function calculateBudgetAchievement(currentReal: number, currentBudget: number) {
  if (!currentBudget) return null;
  return (currentReal / currentBudget) * 100;
}

function calculateMarginPercent(grossMargin: number | null, currentReal: number) {
  if (grossMargin === null || !currentReal) return null;
  return (grossMargin / currentReal) * 100;
}

function addNullableNumbers(current: number | null, next: number | null) {
  if (next === null) return current;
  return (current ?? 0) + next;
}

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

function EmptyCell({ value }: { value: string }) {
  return <span className={value === "-" ? "text-white/60" : undefined}>{value}</span>;
}

export function VariationsDashboard({
  summary,
}: {
  summary: VariationsSummary;
}) {
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(ALL_VALUE);
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);
  const [selectedLinea, setSelectedLinea] = useState<string>(ALL_VALUE);

  const availableLineas = useMemo(() => {
    if (selectedNegocio === ALL_VALUE) return [];

    const lineas = new Set<string>();
    for (const row of summary.rows) {
      if (row.negocio === selectedNegocio) lineas.add(row.linea);
    }

    return [...lineas].sort((a, b) => a.localeCompare(b));
  }, [selectedNegocio, summary.rows]);

  const filteredRows = useMemo(() => {
    return summary.rows.filter((row) => {
      if (selectedYear !== ALL_VALUE && row.importYear !== Number(selectedYear)) return false;
      if (selectedPeriod !== ALL_VALUE && row.periodo !== selectedPeriod) return false;
      if (selectedNegocio !== ALL_VALUE && row.negocio !== selectedNegocio) return false;
      if (selectedLinea !== ALL_VALUE && row.linea !== selectedLinea) return false;
      return true;
    });
  }, [selectedLinea, selectedNegocio, selectedPeriod, selectedYear, summary.rows]);

  const byNegocio = useMemo(() => {
    const grouped = new Map<string, VariationAggregate>();

    for (const row of filteredRows) {
      const key = row.negocio ?? "Sin negocio";
      const current = grouped.get(key) ?? {
        label: key,
        previousReal: 0,
        currentBudget: 0,
        currentReal: 0,
        grossMargin: null,
      };

      current.previousReal += row.previousReal;
      current.currentBudget += row.currentBudget;
      current.currentReal += row.currentReal;
      current.grossMargin = addNullableNumbers(current.grossMargin, row.grossMargin);
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((a, b) => b.currentReal - a.currentReal);
  }, [filteredRows]);

  const totalCurrentReal = byNegocio.reduce((sum, row) => sum + row.currentReal, 0);

  const byLinea = useMemo(() => {
    const grouped = new Map<string, VariationAggregate>();

    for (const row of filteredRows) {
      const current = grouped.get(row.linea) ?? {
        label: row.linea,
        previousReal: 0,
        currentBudget: 0,
        currentReal: 0,
        grossMargin: null,
      };

      current.previousReal += row.previousReal;
      current.currentBudget += row.currentBudget;
      current.currentReal += row.currentReal;
      current.grossMargin = addNullableNumbers(current.grossMargin, row.grossMargin);
      grouped.set(row.linea, current);
    }

    return [...grouped.values()].sort((a, b) => b.currentReal - a.currentReal);
  }, [filteredRows]);

  const totals = useMemo(() => {
    return byLinea.reduce<VariationTotals>(
      (acc, row) => ({
        previousReal: acc.previousReal + row.previousReal,
        currentBudget: acc.currentBudget + row.currentBudget,
        currentReal: acc.currentReal + row.currentReal,
        grossMargin: addNullableNumbers(acc.grossMargin, row.grossMargin),
      }),
      {
        previousReal: 0,
        currentBudget: 0,
        currentReal: 0,
        grossMargin: null,
      },
    );
  }, [byLinea]);

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

  const periodOptions = useMemo(
    () => [
      { label: "Todos los periodos", value: ALL_VALUE },
      ...summary.periodos.map((periodo) => ({ label: periodo, value: periodo })),
    ],
    [summary.periodos],
  );

  const lineaOptions = useMemo(
    () => [
      { label: "Todas las lineas", value: ALL_VALUE },
      ...availableLineas.map((linea) => ({ label: linea, value: linea })),
    ],
    [availableLineas],
  );

  const activeYearLabel =
    selectedYear === ALL_VALUE ? "Todos los años" : selectedYear;
  const activePeriodLabel =
    selectedPeriod === ALL_VALUE ? "Todos los periodos" : selectedPeriod;
  const activeNegocioLabel =
    selectedNegocio === ALL_VALUE ? "Todos los negocios" : selectedNegocio;
  const activeLineaLabel =
    selectedLinea === ALL_VALUE ? "Todas las lineas" : selectedLinea;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#0b1220_0%,#24364f_42%,#7ea7cf_100%)] p-6 text-white shadow-[0_24px_80px_rgba(10,18,32,0.28)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_28%)]" />
        <div className="absolute inset-y-0 right-[-9rem] w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-sm uppercase tracking-[0.32em] text-white/70">
              Dashboard variaciones
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Variaciones por negocio y línea
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/82">
              Cruza la carga contable con el mapeo línea-negocio de AX para comparar año anterior real, presupuesto actual y real actual.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/85">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {activeYearLabel}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {activePeriodLabel}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {activeNegocioLabel}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
                {activeLineaLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-lg shadow-black/10 backdrop-blur-md md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect label="Año" value={selectedYear} options={yearOptions} onChange={setSelectedYear} />
            <FilterSelect label="Periodo" value={selectedPeriod} options={periodOptions} onChange={setSelectedPeriod} />
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
        <KpiCard title="Real actual visible" value={totals.currentReal} icon={BarChart3} tone="primary" />
        <KpiCard title="Negocios visibles" value={byNegocio.length} icon={PackageOpen} tone="success" format="number" />
        <KpiCard title="Registros considerados" value={filteredRows.length} icon={Filter} tone="warning" format="number" />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Variaciones por negocio</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Lectura consolidada del real, presupuesto y margen por negocio visible.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1300px] text-sm">
                <thead className="bg-[#44536c] text-white">
                <tr>
                  <th className="min-w-[220px] px-4 py-4 text-left text-sm font-semibold">Negocio</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">
                    {selectedYear === ALL_VALUE ? "Año anterior real" : `${Number(selectedYear) - 1} real`}
                  </th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">
                    {selectedYear === ALL_VALUE ? "Año actual ppto" : `${selectedYear} ppto`}
                  </th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">
                    {selectedYear === ALL_VALUE ? "Año actual real" : `${selectedYear} real`}
                  </th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">Variación imp.</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">% Variación</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">% Logro ppto</th>
                  <th className="min-w-[120px] px-4 py-4 text-right text-sm font-semibold">MB</th>
                  <th className="min-w-[120px] px-4 py-4 text-right text-sm font-semibold">%MB</th>
                </tr>
              </thead>
                <tbody className="bg-[#061018] text-white">
                {byNegocio.length ? (
                  byNegocio.map((row, index) => {
                    const variationAmount = row.currentReal - row.previousReal;
                    const variationPercent = calculateVariationPercent(row.currentReal, row.previousReal);
                    const budgetAchievement = calculateBudgetAchievement(row.currentReal, row.currentBudget);
                    const marginPercent = calculateMarginPercent(row.grossMargin, row.currentReal);

                    return (
                      <tr
                        key={row.label}
                        className={index % 2 === 0 ? "border-b border-white/8 bg-black/80" : "border-b border-white/8 bg-white/[0.03]"}
                      >
                        <td className="px-4 py-3.5 font-medium">{row.label}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(row.previousReal)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(row.currentBudget)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(row.currentReal)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(variationAmount)}</td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(variationPercent)}</td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(budgetAchievement)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {row.grossMargin === null ? <EmptyCell value="-" /> : formatPen(row.grossMargin)}
                        </td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(marginPercent)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-white/70">
                      No hay variaciones para los filtros seleccionados.
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Variaciones por línea</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Desglose detallado por línea con participación de venta y margen.
              </p>
            </div>
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              Real visible <span className="font-semibold text-foreground">{formatCurrency(totals.currentReal)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1500px] text-sm">
                <thead className="bg-[#44536c] text-white">
                <tr>
                  <th className="min-w-[220px] px-4 py-4 text-left text-sm font-semibold">Líneas</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">
                    {selectedYear === ALL_VALUE ? "Año anterior real" : `${Number(selectedYear) - 1} real`}
                  </th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">
                    {selectedYear === ALL_VALUE ? "Año actual ppto" : `${selectedYear} ppto`}
                  </th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">
                    {selectedYear === ALL_VALUE ? "Año actual real" : `${selectedYear} real`}
                  </th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">Variación imp.</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">% Variación</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">% Part venta</th>
                  <th className="min-w-[120px] px-4 py-4 text-right text-sm font-semibold">MB</th>
                  <th className="min-w-[120px] px-4 py-4 text-right text-sm font-semibold">%MB</th>
                  <th className="min-w-[140px] px-4 py-4 text-right text-sm font-semibold">% Part margen</th>
                </tr>
              </thead>
                <tbody className="bg-[#061018] text-white">
                {byLinea.length ? (
                  byLinea.map((row, index) => {
                    const variationAmount = row.currentReal - row.previousReal;
                    const variationPercent = calculateVariationPercent(row.currentReal, row.previousReal);
                    const salesShare = totalCurrentReal ? (row.currentReal / totalCurrentReal) * 100 : null;
                    const marginPercent = calculateMarginPercent(row.grossMargin, row.currentReal);
                    const totalGrossMargin = totals.grossMargin ?? 0;
                    const marginShare =
                      row.grossMargin !== null && totalGrossMargin
                        ? (row.grossMargin / totalGrossMargin) * 100
                        : null;

                    return (
                      <tr
                        key={row.label}
                        className={index % 2 === 0 ? "border-b border-white/8 bg-black/80" : "border-b border-white/8 bg-white/[0.03]"}
                      >
                        <td className="px-4 py-3.5 font-medium">{row.label}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(row.previousReal)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(row.currentBudget)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(row.currentReal)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">{formatPen(variationAmount)}</td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(variationPercent)}</td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(salesShare)}</td>
                        <td className="px-4 py-3.5 text-right tabular-nums">
                          {row.grossMargin === null ? <EmptyCell value="-" /> : formatPen(row.grossMargin)}
                        </td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(marginPercent)}</td>
                        <td className="px-4 py-3.5 text-right">{formatPercent(marginShare)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-white/70">
                      No hay líneas para mostrar con los filtros actuales.
                    </td>
                  </tr>
                )}
                </tbody>
                <tfoot className="bg-[#d9d9d9] text-black">
                  <tr>
                    <td className="px-4 py-4 font-semibold">Total general</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatPen(totals.previousReal)}</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatPen(totals.currentBudget)}</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatPen(totals.currentReal)}</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                    {formatPen(totals.currentReal - totals.previousReal)}
                  </td>
                    <td className="px-4 py-4 text-right font-semibold">
                    {formatPercent(calculateVariationPercent(totals.currentReal, totals.previousReal))}
                  </td>
                    <td className="px-4 py-4 text-right font-semibold">100%</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">
                    {totals.grossMargin === null ? "-" : formatPen(totals.grossMargin)}
                  </td>
                    <td className="px-4 py-4 text-right font-semibold">
                    {formatPercent(calculateMarginPercent(totals.grossMargin, totals.currentReal))}
                  </td>
                    <td className="px-4 py-4 text-right font-semibold">
                    {totals.grossMargin === null ? "-" : "100%"}
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
