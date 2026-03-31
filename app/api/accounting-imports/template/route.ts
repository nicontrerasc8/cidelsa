import { NextResponse } from "next/server";

import { buildAccountingTemplateWorkbook } from "@/modules/imports/template/accounting-template";

export const runtime = "nodejs";

export async function GET() {
  const buffer = await buildAccountingTemplateWorkbook();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-contabilidad.xlsx"',
    },
  });
}
