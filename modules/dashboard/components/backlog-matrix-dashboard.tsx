"use client";

import { useMemo, useState } from "react";
import { Layers3, ListFilter, PackageOpen } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import {
  type BacklogMatrixSummary,
} from "@/modules/dashboard/services/backlog-matrix";
import { buildBacklogMatrix } from "@/modules/dashboard/lib/backlog-matrix";

const ALL_VALUE = "__all__";

function formatPen(value: number) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function BacklogMatrixDashboard({
  summary,
  title = "Backlog por linea y mes",
  eyebrow = "Dashboard backlog",
  description = "Se consideran solo filas donde `BL / Proy` llega como `Back Log`. El cuadro muestra ventas distribuidas por linea y mes, con filtro por negocio.",
  cardTitle = "Matriz de backlog",
  totalLabel = "Backlog total",
  emptyLabel = "No hay backlog para el negocio seleccionado.",
  totalVisibleLabel = "Total backlog visible:",
}: {
  summary: BacklogMatrixSummary;
  title?: string;
  eyebrow?: string;
  description?: string;
  cardTitle?: string;
  totalLabel?: string;
  emptyLabel?: string;
  totalVisibleLabel?: string;
}) {
  const [selectedNegocio, setSelectedNegocio] = useState<string>(ALL_VALUE);

  const matrix = useMemo(
    () => buildBacklogMatrix(summary, selectedNegocio === ALL_VALUE ? null : selectedNegocio),
    [selectedNegocio, summary],
  );

  const negocioOptions = useMemo(
    () => [
      { label: "Todos los negocios", value: ALL_VALUE },
      ...summary.negocios.map((negocio) => ({ label: negocio, value: negocio })),
    ],
    [summary.negocios],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#0d1321_0%,#22324c_45%,#8ccf4d_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/80">
              {description}
            </p>
          </div>

          <div className="min-w-[280px] rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="space-y-2">
              <Label>Negocio</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedNegocio}
                onChange={(event) => setSelectedNegocio(event.target.value)}
              >
                {negocioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard title={totalLabel} value={matrix.grandTotal} icon={Layers3} tone="primary" />
        <KpiCard title="Lineas activas" value={matrix.lines.length} icon={PackageOpen} tone="success" format="number" />
        <KpiCard
          title="Negocio filtrado"
          value={selectedNegocio === ALL_VALUE ? summary.negocios.length : 1}
          icon={ListFilter}
          tone="warning"
          format="number"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-[1.5rem] border border-border bg-card">
            <table className="min-w-[1500px] text-sm">
              <thead className="bg-[#44536c] text-white">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[220px] bg-[#44536c] px-4 py-3 text-left text-sm font-semibold">
                    Lineas
                  </th>
                  {matrix.months.map((month) => (
                    <th
                      key={month}
                      className="min-w-[120px] bg-[#44536c] px-4 py-3 text-right text-sm font-semibold"
                    >
                      {month}
                    </th>
                  ))}
                  <th className="min-w-[140px] bg-[#44536c] px-4 py-3 text-right text-sm font-semibold">
                    Total general
                  </th>
                </tr>
              </thead>
              <tbody className="bg-black text-white">
                {matrix.lines.length ? (
                  matrix.lines.map((line) => (
                    <tr key={line.linea} className="border-b border-white/10">
                      <td className="sticky left-0 bg-black px-4 py-3 font-medium">
                        {line.linea}
                      </td>
                      {line.months.map((value, index) => (
                        <td key={`${line.linea}-${index}`} className="px-4 py-3 text-right">
                          {value ? formatPen(value) : "-"}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatPen(line.total)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={14}
                      className="px-4 py-12 text-center text-sm text-white/70"
                    >
                      {emptyLabel}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#d9d9d9] text-black">
                <tr>
                  <td className="sticky left-0 bg-[#d9d9d9] px-4 py-3 font-semibold">
                    Total general
                  </td>
                  {matrix.monthTotals.map((value, index) => (
                    <td key={`total-${index}`} className="px-4 py-3 text-right font-semibold">
                      {value ? formatPen(value) : "-"}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right text-lg font-bold">
                    {formatPen(matrix.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {totalVisibleLabel} <span className="font-medium text-foreground">{formatCurrency(matrix.grandTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
