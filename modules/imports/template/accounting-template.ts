import ExcelJS from "exceljs";

const accountingTemplateHeaders = [
  "Linea",
  "año anterior real",
  "año actual ppto",
  "año actual real",
  "MB",
] as const;

export async function buildAccountingTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Codex";
  workbook.created = new Date();

  const dataSheet = workbook.addWorksheet("Plantilla Contabilidad");
  dataSheet.addRow(accountingTemplateHeaders);
  dataSheet.addRow([
    "Manga de Ventilacion",
    1250000,
    1380000,
    1295000,
    412000,
  ]);

  const headerRow = dataSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17456D" },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  dataSheet.columns = accountingTemplateHeaders.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 6, 24),
  }));
  dataSheet.views = [{ state: "frozen", ySplit: 1 }];

  const guideSheet = workbook.addWorksheet("Guia");
  guideSheet.columns = [
    { header: "Campo", key: "field", width: 28 },
    { header: "Uso", key: "usage", width: 64 },
  ];
  guideSheet.getRow(1).font = { bold: true };
  guideSheet.addRows([
    ["Linea", "Nombre de la linea contable/comercial que se quiere comparar."],
    ["año anterior real", "Monto real del año anterior. Se guarda como numero si la celda es numerica."],
    ["año actual ppto", "Presupuesto del año actual. Se guarda como numero si la celda es numerica."],
    ["año actual real", "Monto real acumulado o final del año actual. Se guarda como numero si la celda es numerica."],
    ["MB", "Margen bruto de la linea. Se usa en el dashboard de variaciones y se guarda como numero si la celda es numerica."],
    ["Fila 1", "Se toma como encabezado. La lectura de datos empieza desde la fila 2."],
  ]);

  return workbook.xlsx.writeBuffer();
}
