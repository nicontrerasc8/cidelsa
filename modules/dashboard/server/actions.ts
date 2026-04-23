"use server";

import { updateTag } from "next/cache";

import { requireRoleAccess } from "@/lib/auth/authorization";
import { executiveDashboardRoles, sellerDashboardRoles } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/types/database";
import {
  DASHBOARD_ACCOUNTING_TAG,
  DASHBOARD_BUDGET_TAG,
  DASHBOARD_IMPORTS_TAG,
} from "@/modules/dashboard/services/dashboard-source-cache";

export async function refreshDashboardDataAction() {
  await requireRoleAccess([
    ...executiveDashboardRoles,
    ...sellerDashboardRoles,
  ] as AppRole[]);

  updateTag(DASHBOARD_IMPORTS_TAG);
  updateTag(DASHBOARD_ACCOUNTING_TAG);
  updateTag(DASHBOARD_BUDGET_TAG);
}
