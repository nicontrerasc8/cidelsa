import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { BillingByLineDashboard } from "@/modules/dashboard/components/billing-by-line-dashboard";
import { getExecutiveBillingByLineSummary } from "@/modules/dashboard/services/executive-billing-by-line";

export default async function SellerBillingByLinePage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveBillingByLineSummary();

  return <BillingByLineDashboard summary={summary} />;
}
