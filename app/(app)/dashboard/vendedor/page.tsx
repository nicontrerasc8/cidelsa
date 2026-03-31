import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SellerDashboardView } from "@/modules/dashboard/components/seller-dashboard-view";
import { getSellerDashboardSummary } from "@/modules/dashboard/services/seller-dashboard";

export default async function SellerDashboardPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getSellerDashboardSummary();

  return <SellerDashboardView summary={summary} />;
}
