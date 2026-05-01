import { forbidden, redirect } from "next/navigation";

import {
  canAccessExecutiveDashboards,
  canAccessSellerDashboard,
} from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";
import {
  ExecutiveDashboardTabsView,
  SellerDashboardTabsView,
} from "@/modules/dashboard/components/dashboard-tabs-view";
import {
  getExecutiveDashboardBundle,
  getSellerDashboardBundle,
} from "@/modules/dashboard/services/dashboard-bundles";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  const tabParam = (await searchParams).tab;
  const initialTab = Array.isArray(tabParam) ? tabParam[0] : tabParam;

  if (!user) {
    redirect("/login");
  }

  if (
    initialTab === "backlog" ||
    initialTab === "proyeccion" ||
    initialTab === "salud-negocio" ||
    initialTab === "volatilidad" ||
    initialTab === "cohortes-clientes"
  ) {
    redirect("/dashboard");
  }

  if (canAccessSellerDashboard(user.role)) {
    const bundle = await getSellerDashboardBundle();
    return <SellerDashboardTabsView bundle={bundle} initialTab={initialTab} />;
  }

  if (canAccessExecutiveDashboards(user.role)) {
    const bundle = await getExecutiveDashboardBundle();
    return <ExecutiveDashboardTabsView bundle={bundle} initialTab={initialTab} />;
  }

  forbidden();
}
