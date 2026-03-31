import { buildImportsTemplateWorkbook } from "@/modules/imports/template/excel-template";

export const runtime = "nodejs";

export async function GET() {
  const buffer = await buildImportsTemplateWorkbook();

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="plantilla-importacion-ax.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
