import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  deleteAccountingImportRow,
  updateAccountingImportRow,
} from "@/modules/imports/services/accounting-import-service";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ importId: string; rowId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    const { importId, rowId } = await params;
    const body = (await request.json()) as {
      linea?: string | null;
      anio_anterior_real?: number | null;
      anio_actual_ppto?: number | null;
      anio_actual_real?: number | null;
      mb?: number | null;
      negocio?: string | null;
      periodo_desde?: string | null;
      periodo_hasta?: string | null;
      periodo?: string | null;
    };

    await updateAccountingImportRow(importId, Number(rowId), {
      linea: body.linea ?? null,
      anio_anterior_real: body.anio_anterior_real ?? null,
      anio_actual_ppto: body.anio_actual_ppto ?? null,
      anio_actual_real: body.anio_actual_real ?? null,
      mb: body.mb ?? null,
      negocio: body.negocio ?? null,
      periodo_desde: body.periodo_desde ?? null,
      periodo_hasta: body.periodo_hasta ?? null,
      periodo: body.periodo ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar la fila contable.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ importId: string; rowId: string }> },
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    const { importId, rowId } = await params;
    await deleteAccountingImportRow(importId, Number(rowId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar la fila contable.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
