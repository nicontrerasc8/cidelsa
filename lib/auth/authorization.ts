import "server-only";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import type { AppRole } from "@/lib/types/database";

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRoleAccess(allowedRoles: AppRole[]) {
  const user = await requireCurrentUser();

  if (!allowedRoles.includes(user.role)) {
    throw new Error("No tienes permisos para ejecutar esta accion.");
  }

  return user;
}
