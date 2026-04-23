import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { deleteBudgetImport } from "@/modules/imports/services/budget-import-service";
import { canAccessImports } from "@/modules/imports/services/import-service";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canAccessImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const { importId } = await params;
    await deleteBudgetImport(importId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo eliminar la importacion de presupuesto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
