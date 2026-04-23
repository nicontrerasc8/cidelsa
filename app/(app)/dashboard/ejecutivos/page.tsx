import { forbidden } from "next/navigation";
import { connection } from "next/server";

import { canAccessExecutiveDashboards } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesByExecutiveDashboard } from "@/modules/dashboard/components/sales-by-executive-dashboard";
import { getSalesByExecutiveSummary } from "@/modules/dashboard/services/sales-by-executive";

export default async function SalesByExecutivePage() {
  await connection();

  const user = await getCurrentUser();

  if (!user || !canAccessExecutiveDashboards(user.role)) {
    forbidden();
  }

  const summary = await getSalesByExecutiveSummary();

  return <SalesByExecutiveDashboard summary={summary} />;
}
