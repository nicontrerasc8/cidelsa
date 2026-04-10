import ExcelJS from "exceljs";

const templateHeaders = [
  "Año",
  "Estado",
  "Mes",
  "Orden de Venta",
  "Fecha de ingreso",
  "Factura",
  "Fecha Factura",
  "OC",
  "Sector",
  "RUC",
  "Cliente",
  "Negocio",
  "Línea",
  "SubLínea",
  "Grupo",
  "Código",
  "Artículo",
  "Dimension1",
  "Dimension2",
  "Dimension 3",
  "Cantidad",
  "UM",
  "Ventas",
  "Ejecutivo de Ventas",
  "Observaciones",
] as const;

export async function buildImportsTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codex";
  workbook.created = new Date();

  const dataSheet = workbook.addWorksheet("Plantilla AX");
  dataSheet.addRow(templateHeaders);
  dataSheet.addRow([
    2026,
    "Facturado",
    "Marzo",
    "OV-100245",
    "2026-01-15",
    "FAC-7788",
    "2026-01-29",
    "OC-88901",
    "Industrial",
    "20601234567",
    "Cliente Demo SAC",
    "Industrial",
    "Tableros",
    "Potencia",
    "Media tension",
    "TAB-220",
    "Tablero de distribucion 220V",
    "D1-A",
    "D2-B",
    "D3-C",
    4,
    "UND",
    "168,000",
    "Ana Perez",
    "Fila de referencia para validar encabezados y tipos.",
  ]);

  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F3D5E" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  dataSheet.columns = templateHeaders.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 4, 18),
  }));
  dataSheet.views = [{ state: "frozen", ySplit: 1 }];

  const guideSheet = workbook.addWorksheet("Guia");
  guideSheet.columns = [
    { header: "Campo", key: "field", width: 28 },
    { header: "Uso", key: "usage", width: 84 },
  ];
  guideSheet.getRow(1).font = { bold: true };
  guideSheet.addRows([
    ["Fecha de ingreso / Fecha Factura", "Usa formato ISO YYYY-MM-DD o una fecha Excel valida."],
    ["Año", "Se guarda por fila cuando venga informado."],
    ["Estado", "Se guarda internamente como situacion para mantener compatibilidad con los dashboards existentes."],
    ["Mes", "Acepta numeros 1-12 o nombres como Marzo."],
    ["Cliente", "Puede venir vacio. La fila igual se conserva en el JSON y queda disponible para edicion."],
    ["RUC", "Se guarda junto al cliente cuando venga informado."],
    ["Ventas", "Acepta numeros directos o texto con separadores como 60,000."],
    ["Sector / SubLinea / Grupo / Dimension1 / Dimension2 / Dimension 3", "Se preservan en el JSON y tambien quedan normalizados para la vista de detalle."],
  ]);

  return workbook.xlsx.writeBuffer();
}
