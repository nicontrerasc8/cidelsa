import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { importYearSchema } from "@/lib/validators/imports";
import {
  createBudgetImportFromUpload,
  saveBudgetImportFromPreview,
} from "@/modules/imports/services/budget-import-service";
import { canAccessImports } from "@/modules/imports/services/import-service";

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

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        fileName?: string;
        importYear?: number;
        sheetName?: string;
        rowsBySection?: unknown;
      };

      if (
        typeof body.fileName !== "string" ||
        typeof body.sheetName !== "string" ||
        !body.rowsBySection ||
        typeof body.rowsBySection !== "object"
      ) {
        return NextResponse.json(
          { error: "Payload de presupuesto invalido para guardar." },
          { status: 400 },
        );
      }

      const result = await saveBudgetImportFromPreview(
        {
          fileName: body.fileName,
          importYear: importYearSchema.parse(body.importYear),
          sheetName: body.sheetName,
          rowsBySection: body.rowsBySection as Parameters<
            typeof saveBudgetImportFromPreview
          >[0]["rowsBySection"],
        },
        currentUser,
      );

      return NextResponse.json(result, { status: 201 });
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
    const result = await createBudgetImportFromUpload(file, currentUser, importYear);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la carga de presupuesto.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
