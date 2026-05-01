import "server-only";

import { getBillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";
import {
  getAccountingDashboardSummary,
  getBudgetDashboardSummary,
} from "@/modules/dashboard/services/financial-dashboards";
import { getSalesByClientSummary } from "@/modules/dashboard/services/sales-by-client";
import { getSalesByExecutiveSummary } from "@/modules/dashboard/services/sales-by-executive";
import { getExecutiveBacklogMatrixSummary } from "@/modules/dashboard/services/executive-backlog-matrix";
import { getExecutiveBillingByLineSummary } from "@/modules/dashboard/services/executive-billing-by-line";
import { getExecutiveProjectionMatrixSummary } from "@/modules/dashboard/services/executive-projection-matrix";
import { getExecutiveSalesByClientSummary } from "@/modules/dashboard/services/executive-sales-by-client";
import { getSellerDashboardSummary } from "@/modules/dashboard/services/seller-dashboard";

export type ExecutiveDashboardBundle = Awaited<ReturnType<typeof getExecutiveDashboardBundle>>;
export type SellerDashboardBundle = Awaited<ReturnType<typeof getSellerDashboardBundle>>;

export async function getExecutiveDashboardBundle() {
  const [
    salesByClient,
    billingByLine,
    salesByExecutive,
    accounting,
    budget,
  ] = await Promise.all([
    getSalesByClientSummary(),
    getBillingByLineSummary(),
    getSalesByExecutiveSummary(),
    getAccountingDashboardSummary(),
    getBudgetDashboardSummary(),
  ]);

  return {
    salesByClient,
    billingByLine,
    salesByExecutive,
    accounting,
    budget,
  };
}

export async function getSellerDashboardBundle() {
  const [seller, salesByClient, billingByLine, backlog, projection] = await Promise.all([
    getSellerDashboardSummary(),
    getExecutiveSalesByClientSummary(),
    getExecutiveBillingByLineSummary(),
    getExecutiveBacklogMatrixSummary(),
    getExecutiveProjectionMatrixSummary(),
  ]);

  return {
    seller,
    salesByClient,
    billingByLine,
    backlog,
    projection,
  };
}
