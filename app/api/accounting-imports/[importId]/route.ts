import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { deleteAccountingImport } from "@/modules/imports/services/accounting-import-service";

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

    const { importId } = await params;
    await deleteAccountingImport(importId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la importacion contable.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
