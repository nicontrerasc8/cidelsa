import type { AppRole } from "@/lib/types/database";

export const importManagerRoles = [
  "administrador_comercial",
] as const satisfies AppRole[];

export const executiveDashboardRoles = [
  "administrador_comercial",
  "gerente_comercial",
  "jefe_area",
  "directorio",
] as const satisfies AppRole[];

export const sellerDashboardRoles = [
  "ejecutivo_ventas",
] as const satisfies AppRole[];

export const roleLabels: Record<AppRole, string> = {
  administrador_comercial: "Administrador Comercial",
  gerente_comercial: "Gerente Comercial",

  
  jefe_area: "Jefe de Area / Linea",
  ejecutivo_ventas: "Ejecutivo de Ventas",
  directorio: "Directorio",
};

export function canManageImports(role: AppRole) {
  return (importManagerRoles as readonly AppRole[]).includes(role);
}

export function canAccessExecutiveDashboards(role: AppRole) {
  return (executiveDashboardRoles as readonly AppRole[]).includes(role);
}

export function canAccessSellerDashboard(role: AppRole) {
  return (sellerDashboardRoles as readonly AppRole[]).includes(role);
}

export function getDefaultDashboardPath(role: AppRole) {
  if (
    canAccessSellerDashboard(role) ||
    canAccessExecutiveDashboards(role) ||
    canManageImports(role)
  ) {
    return "/dashboard";
  }

  return "/";
}

export function canAccessSidebarPath(role: AppRole, path: string) {
  if (path === "/dashboard/imports") {
    return canManageImports(role);
  }

  const tab = path.includes("?") ? new URLSearchParams(path.split("?")[1]).get("tab") : null;

  if (tab?.startsWith("vendedor-")) {
    return canAccessSellerDashboard(role);
  }

  if (path === "/dashboard") {
    return canAccessExecutiveDashboards(role) || canAccessSellerDashboard(role);
  }

  return canAccessExecutiveDashboards(role);
}
