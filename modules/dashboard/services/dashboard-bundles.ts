import "server-only";

import { canViewMargins } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/types/database";
import { getBillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";
import { getCurrentPortfolioSummary } from "@/modules/dashboard/services/current-portfolio";
import {
  buildBudgetVsAccountingSummaryFromAccountingSummary,
  getAccountingDashboardSummary,
  type BudgetVsAccountingSummary,
  type FinancialSummary,
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

function hideFinancialMargins(summary: FinancialSummary): FinancialSummary {
  return {
    ...summary,
    hasMarginAccess: false,
    rows: summary.rows.map((row) => ({
      ...row,
      grossMargin: null,
    })),
  };
}

function hideBudgetVsAccountingMargins(
  summary: BudgetVsAccountingSummary,
): BudgetVsAccountingSummary {
  return {
    ...summary,
    hasMarginAccess: false,
    rows: summary.rows.map((row) => ({
      ...row,
      previousGrossMargin: 0,
      grossMargin: 0,
    })),
  };
}

export async function getExecutiveDashboardBundle(role?: AppRole) {
  const [
    salesByClient,
    billingByLine,
    salesByExecutive,
    currentPortfolio,
    accounting,
  ] = await Promise.all([
    getSalesByClientSummary(),
    getBillingByLineSummary(),
    getSalesByExecutiveSummary(),
    getCurrentPortfolioSummary(),
    getAccountingDashboardSummary(),
  ]);
  const canSeeMargins = role ? canViewMargins(role) : true;
  const visibleAccounting = canSeeMargins ? accounting : hideFinancialMargins(accounting);
  const budgetVsAccounting = buildBudgetVsAccountingSummaryFromAccountingSummary(visibleAccounting);

  return {
    salesByClient,
    billingByLine,
    salesByExecutive,
    currentPortfolio,
    accounting: visibleAccounting,
    budgetVsAccounting: canSeeMargins ? budgetVsAccounting : hideBudgetVsAccountingMargins(budgetVsAccounting),
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
