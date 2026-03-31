import { forbidden } from "next/navigation";

import { canAccessSellerDashboard } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import { SalesByClientDashboard } from "@/modules/dashboard/components/sales-by-client-dashboard";
import { getExecutiveSalesByClientSummary } from "@/modules/dashboard/services/executive-sales-by-client";

export default async function SellerClientsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessSellerDashboard(user.role)) {
    forbidden();
  }

  const summary = await getExecutiveSalesByClientSummary();

  return <SalesByClientDashboard summary={summary} />;
}
