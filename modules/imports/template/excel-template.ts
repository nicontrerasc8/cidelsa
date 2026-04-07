import ExcelJS from "exceljs";

const templateHeaders = [
  "Año",
  "Situación",
  "Mes",
  "Semana",
  "Orden de Venta",
  "Fecha de registro",
  "Fecha de adjudicación",
  "Factura",
  "Fecha Facturación",
  "OC",
  "Sector AX",
  "Sector",
  "RUC",
  "Cliente",
  "Negocio",
  "Línea",
  "SubLínea",
  "Grupo",
  "Nombre de Proyecto",
  "Código",
  "Artículo",
  "Dimension1",
  "Dimension2",
  "Dimension 3",
  "Cantidad",
  "UM",
  "Etapa",
  "Motivo Pérdida",
  "BL / Proy",
  "Pipeline",
  "Licitaciones",
  "Probabilidad",
  "Ventas S/",
  "Proyección",
  "Costo",
  "Margen",
  "Porcentaje",
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
    "Backlog",
    "Marzo",
    3,
    "OV-100245",
    "2026-01-15",
    "2026-01-20",
    "FAC-7788",
    "2026-01-29",
    "OC-88901",
    "Industrial AX",
    "Industrial",
    "20601234567",
    "Cliente Demo SAC",
    "Energia",
    "Tableros",
    "Potencia",
    "Media tension",
    "Ampliacion subestacion",
    "TAB-220",
    "Tablero de distribucion 220V",
    "D1-A",
    "D2-B",
    "D3-C",
    4,
    "UND",
    "Negociacion",
    "",
    "Proy",
    "Pipeline activo",
    "Si",
    "75%",
    "168,000",
    "180,000",
    "120,000",
    "60,000",
    "35.71",
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
    ["Fecha registro / adjudicacion / facturacion", "Usa formato ISO `YYYY-MM-DD` o una fecha Excel valida."],
    ["Año", "Se guarda por fila cuando venga informado. El año del lote se sigue eligiendo en la interfaz."],
    ["Mes / Semana", "Mes acepta numeros `1-12` o nombres como `Marzo`. Semana acepta enteros."],
    ["Cliente", "Puede venir vacio. La fila igual se conserva en el JSON y queda disponible para edicion."],
    ["RUC", "Se guarda junto al cliente cuando venga informado."],
    ["Probabilidad", "Acepta `0-1`, `0-100` o texto como `75%`. El sistema recalcula `forecast_ponderado`."],
    ["Ventas S/ / Proyección / Costo / Margen / Porcentaje", "Aceptan numeros directos o texto con separadores como `60,000` o `100%`."],
    ["BL / Proy", "Se usa como tipo de pipeline. Si no viene, se toma la columna `Pipeline`."],
    ["Licitaciones", "Acepta `Si`, `Yes`, `True`, `1`, `X`, `No` o `0`."],
    ["Sector AX / SubLínea / Grupo / Dimension1 / Dimension2 / Dimension 3", "Se preservan en el JSON y tambien quedan normalizados para la vista de detalle."],
    ["Año de carga", "Se elige en la interfaz al subir el archivo y queda guardado en la tabla `imports`."],
  ]);

  return workbook.xlsx.writeBuffer();
}
