import { forbidden } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { ImportsPageView } from "@/modules/imports/components/imports-page-view";
import { listRecentAccountingImports } from "@/modules/imports/services/accounting-import-service";
import { listRecentBudgetImports } from "@/modules/imports/services/budget-import-service";
import { canAccessImports, listRecentImports } from "@/modules/imports/services/import-service";

export default async function ImportsPage() {
  const user = await getCurrentUser();

  if (!user || !canAccessImports(user.role)) {
    forbidden();
  }

  const [imports, accountingImports, budgetImports] = await Promise.all([
    listRecentImports(),
    listRecentAccountingImports(),
    listRecentBudgetImports(),
  ]);

  return (
    <ImportsPageView
      imports={imports}
      accountingImports={accountingImports}
      budgetImports={budgetImports}
    />
  );
}
