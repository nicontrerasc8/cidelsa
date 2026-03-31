import { redirect } from "next/navigation";

import { getDefaultDashboardPath } from "@/lib/auth/roles";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(getDefaultDashboardPath(user.role));
  }

  redirect("/login");
}
