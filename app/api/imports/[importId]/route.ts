import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteImport,
  updateImportMetadata,
} from "@/modules/imports/services/import-service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    const { importId } = await params;
    await request.json().catch(() => null);
    await updateImportMetadata(importId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la importacion.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
    await deleteImport(importId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la importacion.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
