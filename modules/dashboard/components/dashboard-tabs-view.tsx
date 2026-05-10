"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  FolderKanban,
  GitCompareArrows,
  TrendingUp,
  User,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingByLineDashboard } from "@/modules/dashboard/components/billing-by-line-dashboard";
import { BudgetVsAccountingDashboard } from "@/modules/dashboard/components/budget-vs-accounting-dashboard";
import { CurrentPortfolioDashboard } from "@/modules/dashboard/components/current-portfolio-dashboard";
import { FinancialFocusDashboard } from "@/modules/dashboard/components/financial-focus-dashboard";
import { SalesByClientDashboard } from "@/modules/dashboard/components/sales-by-client-dashboard";
import { SalesByExecutiveDashboard } from "@/modules/dashboard/components/sales-by-executive-dashboard";
import { SalesYearComparisonDashboard } from "@/modules/dashboard/components/sales-year-comparison-dashboard";
import { SellerDashboardView } from "@/modules/dashboard/components/seller-dashboard-view";
import type { ExecutiveDashboardBundle, SellerDashboardBundle } from "@/modules/dashboard/services/dashboard-bundles";

type DashboardTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
};

function updateTabUrl(tab: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
}

function DashboardTabs({
  tabs,
  initialTab,
}: {
  tabs: DashboardTab[];
  initialTab?: string;
}) {
  const fallbackTab = tabs[0]?.id ?? "";
  const initialValue = tabs.some((tab) => tab.id === initialTab) ? initialTab ?? fallbackTab : fallbackTab;
  const [activeTab, setActiveTab] = useState(initialValue);

  function handleTabChange(value: string) {
    setActiveTab(value);
    updateTabUrl(value);
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-3 shadow-xl shadow-black/20">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {tabs.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="min-h-11 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-300 transition data-[state=active]:bg-white data-[state=active]:text-slate-950"
            >
              <Icon className="mr-2 size-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="m-0">
          {activeTab === tab.id ? tab.content : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function ExecutiveDashboardTabsView({
  bundle,
  initialTab,
}: {
  bundle: ExecutiveDashboardBundle;
  initialTab?: string;
}) {
  const tabs = useMemo<DashboardTab[]>(
    () => [
      {
        id: "ventas-clientes",
        label: "Ventas por Cliente",
        icon: UsersRound,
        content: <SalesByClientDashboard summary={bundle.salesByClient} />,
      },
      {
        id: "comparativo-anual",
        label: "Comparativo Anual",
        icon: TrendingUp,
        content: <SalesYearComparisonDashboard summary={bundle.salesByClient} />,
      },
      // {
      //   id: "facturacion-linea",
      //   label: "Facturacion por Linea",
      //   icon: BriefcaseBusiness,
      //   content: <BillingByLineDashboard summary={bundle.billingByLine} />,
      // },
      {
        id: "ejecutivos",
        label: "Ejecutivos",
        icon: UserRound,
        content: <SalesByExecutiveDashboard summary={bundle.salesByExecutive} />,
      },
      {
        id: "estado-comercial",
        label: "Estado Comercial",
        icon: FolderKanban,
        content: <CurrentPortfolioDashboard summary={bundle.currentPortfolio} />,
      },
      {
        id: "contabilidad",
        label: "Contabilidad",
        icon: GitCompareArrows,
        content: <FinancialFocusDashboard mode="accounting-budget" summary={bundle.accounting} />,
      },
      {
        id: "presupuesto-contabilidad",
        label: "PPTO vs Real",
        icon: GitCompareArrows,
        content: <BudgetVsAccountingDashboard summary={bundle.budgetVsAccounting} />,
      },
    ],
    [bundle],
  );

  return <DashboardTabs tabs={tabs} initialTab={initialTab} />;
}

export function SellerDashboardTabsView({
  bundle,
  initialTab,
}: {
  bundle: SellerDashboardBundle;
  initialTab?: string;
}) {
  const tabs = useMemo<DashboardTab[]>(
    () => [
      {
        id: "vendedor-resumen",
        label: "Mi panel",
        icon: User,
        content: <SellerDashboardView summary={bundle.seller} />,
      },
      {
        id: "vendedor-clientes",
        label: "Mis clientes",
        icon: UsersRound,
        content: <SalesByClientDashboard summary={bundle.salesByClient} />,
      },
      {
        id: "vendedor-comparativo-anual",
        label: "Mi historico",
        icon: TrendingUp,
        content: <SalesYearComparisonDashboard summary={bundle.salesByClient} />,
      },
      {
        id: "vendedor-facturacion-linea",
        label: "Mis lineas",
        icon: BriefcaseBusiness,
        content: <BillingByLineDashboard summary={bundle.billingByLine} />,
      },
      // {
      //   id: "vendedor-backlog",
      //   label: "Mi backlog",
      //   icon: FolderKanban,
      //   content: (
      //     <BacklogMatrixDashboard
      //       summary={bundle.backlog}
      //       eyebrow="Dashboard ejecutivo"
      //       title="Mi backlog por linea y mes"
      //       description="Backlog visible solo para las filas donde el campo Ejecutivo coincide con tu nombre."
      //       cardTitle="Matriz de mi backlog"
      //       totalLabel="Mi backlog total"
      //       emptyLabel="No hay backlog visible para tu usuario."
      //       totalVisibleLabel="Total backlog visible:"
      //       showEtapaFilter={false}
      //     />
      //   ),
      // },
      // {
      //   id: "vendedor-proyeccion",
      //   label: "Mi proyeccion",
      //   icon: GitCompareArrows,
      //   content: (
      //     <BacklogMatrixDashboard
      //       summary={bundle.projection}
      //       eyebrow="Dashboard ejecutivo"
      //       title="Mi proyeccion por linea y mes"
      //       description="Proyeccion visible solo para las filas donde el campo Ejecutivo coincide con tu nombre."
      //       cardTitle="Matriz de mi proyeccion"
      //       totalLabel="Mi proyeccion total"
      //       emptyLabel="No hay proyeccion visible para tu usuario."
      //       totalVisibleLabel="Total proyeccion visible:"
      //       showSituacionBreakdown={false}
      //       defaultEtapaValue="informacion"
      //     />
      //   ),
      // },
    ],
    [bundle],
  );

  return <DashboardTabs tabs={tabs} initialTab={initialTab} />;
}
