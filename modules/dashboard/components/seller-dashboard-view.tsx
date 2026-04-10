import { BadgeDollarSign, BriefcaseBusiness, ReceiptText, UsersRound } from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableElement,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SellerDashboardSummary } from "@/modules/dashboard/services/seller-dashboard";

export function SellerDashboardView({
  summary,
}: {
  summary: SellerDashboardSummary;
}) {
  const topRows = summary.rows.slice(0, 15);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/60 bg-[linear-gradient(135deg,#0b1f33_0%,#145b8a_42%,#89c8b8_100%)] p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.3em] text-white/70">Vista ejecutivo</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Mis registros</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
          Este panel solo muestra filas donde tu nombre completo coincide con el campo Ejecutivo del archivo comercial cargado.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/75">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
            {summary.years.length ? `${summary.years.length} años visibles` : "Sin años visibles"}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
            {summary.negocios.length ? `${summary.negocios.length} negocios` : "Sin negocios"}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">
            {summary.lineas.length ? `${summary.lineas.length} lineas` : "Sin lineas"}
          </span>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <KpiCard title="Ventas visibles" value={summary.totalVentas} icon={BadgeDollarSign} tone="primary" />
        <KpiCard title="Facturado" value={summary.totalFacturado} icon={ReceiptText} tone="success" />
        <KpiCard title="Registros" value={summary.registros} icon={BriefcaseBusiness} tone="warning" format="number" />
        <KpiCard title="Clientes activos" value={summary.clientesActivos} icon={UsersRound} tone="default" format="number" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Detalle visible para tu usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableElement>
              <TableHead>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell>Negocio</TableHeaderCell>
                  <TableHeaderCell>Linea</TableHeaderCell>
                  <TableHeaderCell>año</TableHeaderCell>
                  <TableHeaderCell>Situacion</TableHeaderCell>
                  <TableHeaderCell>Fecha facturacion</TableHeaderCell>
                  <TableHeaderCell className="text-right">Ventas</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {topRows.length ? (
                  topRows.map((row, index) => (
                    <TableRow key={`${row.cliente}-${row.linea}-${row.anio}-${index}`}>
                      <TableCell className="font-medium">{row.cliente}</TableCell>
                      <TableCell>{row.negocio ?? "-"}</TableCell>
                      <TableCell>{row.linea ?? "-"}</TableCell>
                      <TableCell>{row.anio ?? "-"}</TableCell>
                      <TableCell>{row.situacion ?? "-"}</TableCell>
                      <TableCell>{formatDate(row.fechaFacturacion)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.ventasMonto)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No hay registros visibles para este ejecutivo.
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
