import { forbidden } from "next/navigation";
import { connection } from "next/server";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BillingByLineDashboard } from "@/modules/dashboard/components/billing-by-line-dashboard";
import { getBillingByLineSummary } from "@/modules/dashboard/services/billing-by-line";

export default async function BillingByLinePage() {
  await connection();

  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getBillingByLineSummary();

  return <BillingByLineDashboard summary={summary} />;
}
