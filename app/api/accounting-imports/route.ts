import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { importYearSchema } from "@/lib/validators/imports";
import { canAccessImports } from "@/modules/imports/services/import-service";
import { createAccountingImportFromUpload } from "@/modules/imports/services/accounting-import-service";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Sesion no valida." }, { status: 401 });
    }

    if (!canAccessImports(currentUser.role)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const importYearRaw = formData.get("anio");
    const negocio = formData.get("negocio");
    const periodoDesde = formData.get("periodo_desde");
    const periodoHasta = formData.get("periodo_hasta");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo Excel valido." },
        { status: 400 },
      );
    }

    if (typeof negocio !== "string" || !negocio.trim()) {
      return NextResponse.json(
        { error: "Debes seleccionar un negocio para la carga contable." },
        { status: 400 },
      );
    }

    if (typeof periodoDesde !== "string" || !periodoDesde.trim()) {
      return NextResponse.json(
        { error: "Debes seleccionar el periodo inicial para la carga contable." },
        { status: 400 },
      );
    }

    if (typeof periodoHasta !== "string" || !periodoHasta.trim()) {
      return NextResponse.json(
        { error: "Debes seleccionar el periodo final para la carga contable." },
        { status: 400 },
      );
    }

    const importYear = importYearSchema.parse(importYearRaw);
    const result = await createAccountingImportFromUpload(
      file,
      currentUser,
      importYear,
      negocio,
      periodoDesde,
      periodoHasta,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la carga contable.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
