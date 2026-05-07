import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CircleDollarSign,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { formatCurrency } from "@/lib/utils";
import type {
  SellerDashboardRow,
  SellerDashboardSummary,
} from "@/modules/dashboard/services/seller-dashboard";

type AggregateRow = {
  name: string;
  amount: number;
  count: number;
  share: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function groupRows(
  rows: SellerDashboardRow[],
  keySelector: (row: SellerDashboardRow) => string | null | undefined,
) {
  const map = new Map<string, { amount: number; count: number }>();

  for (const row of rows) {
    const key = keySelector(row) || "Sin dato";
    const current = map.get(key) ?? { amount: 0, count: 0 };
    current.amount += row.ventasMonto;
    current.count += 1;
    map.set(key, current);
  }

  const total = [...map.values()].reduce((sum, row) => sum + row.amount, 0);

  return [...map.entries()]
    .map<AggregateRow>(([name, value]) => ({
      name,
      amount: value.amount,
      count: value.count,
      share: total ? (value.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function Kpi({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sky-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

function RankingCard({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: AggregateRow[];
}) {
  const maxAmount = rows[0]?.amount || 1;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/20">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6 space-y-4">
        {rows.length ? (
          rows.slice(0, 8).map((row) => (
            <div key={row.name} className="space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(row.count)} registros · {formatPercent(row.share)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-sky-300">{formatCurrency(row.amount)}</p>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-sky-400"
                  style={{ width: `${Math.max(4, (row.amount / maxAmount) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
            No hay datos visibles.
          </div>
        )}
      </div>
    </section>
  );
}

export function SellerDashboardView({
  summary,
}: {
  summary: SellerDashboardSummary;
}) {
  const rows = summary.rows;
  const topClients = groupRows(rows, (row) => row.cliente);
  const topLines = groupRows(rows, (row) => row.linea);
  const statusRows = groupRows(rows, (row) => row.situacion);
  const yearRows = groupRows(rows, (row) => (row.anio ? String(row.anio) : null));
  const topDeals = rows.slice(0, 10);
  const ticketPromedio = summary.registros ? summary.totalVentas / summary.registros : 0;
  const facturadoShare = summary.totalVentas
    ? (summary.totalFacturado / summary.totalVentas) * 100
    : 0;
  const topClientShare = topClients[0]?.share ?? 0;

  return (
    <div className="min-h-screen bg-[#05080f] p-4 text-slate-300 lg:p-6">
      <div className="mx-auto max-w-[1450px] space-y-6">
        <header className="rounded-3xl border border-sky-500/20 bg-[linear-gradient(135deg,#07111f_0%,#0b1f33_52%,#145b8a_100%)] p-7 shadow-2xl shadow-black/30">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">
            Vista comercial personal
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">Mi cartera visible</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Resumen de tus filas comerciales cargadas en imports, enfocado en venta, clientes, líneas y situación.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Kpi
            title="Venta visible"
            value={formatCurrency(summary.totalVentas)}
            subtitle={`${formatNumber(summary.registros)} registros comerciales`}
            icon={<BadgeDollarSign className="size-5" />}
          />
          <Kpi
            title="Facturado"
            value={formatCurrency(summary.totalFacturado)}
            subtitle={`${formatPercent(facturadoShare)} de la venta visible`}
            icon={<CircleDollarSign className="size-5" />}
          />
          <Kpi
            title="Ticket promedio"
            value={formatCurrency(ticketPromedio)}
            subtitle="Promedio por registro visible"
            icon={<Target className="size-5" />}
          />
          <Kpi
            title="Clientes"
            value={formatNumber(summary.clientesActivos)}
            subtitle={`Cliente top concentra ${formatPercent(topClientShare)}`}
            icon={<UsersRound className="size-5" />}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <RankingCard
            title="Clientes principales"
            subtitle="Dónde se concentra tu venta visible."
            rows={topClients}
          />
          <RankingCard
            title="Líneas principales"
            subtitle="Mix de productos o líneas que más pesan en tu cartera."
            rows={topLines}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <RankingCard
            title="Situación comercial"
            subtitle="Lectura rápida del estado de tus registros."
            rows={statusRows}
          />

          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Evolución por año</h2>
                <p className="mt-1 text-sm text-slate-500">Venta visible agrupada por año de carga/actividad.</p>
              </div>
              <TrendingUp className="size-5 text-sky-300" />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {yearRows.slice(0, 8).map((row) => (
                <div key={row.name} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{row.name}</p>
                  <p className="mt-2 text-lg font-bold text-white">{formatCurrency(row.amount)}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatNumber(row.count)} registros</p>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-black/20">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Operaciones de mayor valor</h2>
              <p className="mt-1 text-sm text-slate-500">Top 10 registros por venta. Sin columnas vacías ni campos de baja señal.</p>
            </div>
            <BriefcaseBusiness className="size-5 text-sky-300" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="bg-slate-950 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Negocio</th>
                  <th className="px-6 py-4">Línea</th>
                  <th className="px-6 py-4">Año</th>
                  <th className="px-6 py-4">Situación</th>
                  <th className="px-6 py-4 text-right">Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {topDeals.length ? (
                  topDeals.map((row, index) => (
                    <tr key={`${row.cliente}-${row.linea}-${row.anio}-${index}`} className="hover:bg-white/5">
                      <td className="px-6 py-4 font-medium text-white">{row.cliente}</td>
                      <td className="px-6 py-4 text-slate-300">{row.negocio ?? "-"}</td>
                      <td className="px-6 py-4 text-slate-300">{row.linea ?? "-"}</td>
                      <td className="px-6 py-4 text-slate-400">{row.anio ?? "-"}</td>
                      <td className="px-6 py-4">
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
                          {row.situacion ?? "Sin situación"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-sky-300">
                        {formatCurrency(row.ventasMonto)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                      No hay registros visibles para este ejecutivo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
