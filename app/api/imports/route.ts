import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { importYearSchema } from "@/lib/validators/imports";
import {
  canAccessImports,
  createImportFromUpload,
} from "@/modules/imports/services/import-service";

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

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo Excel valido." },
        { status: 400 },
      );
    }

    const importYear = importYearSchema.parse(importYearRaw);
    const result = await createImportFromUpload(file, currentUser, importYear);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo procesar la carga.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
