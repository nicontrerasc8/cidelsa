import ExcelJS from "exceljs";

const templateHeaders = [
  "Situación",
  "Mes",
  "Semana",
  "Orden de Venta",
  "Fecha de registro",
  "Fecha de adjudicación",
  "Factura",
  "Fecha Facturación",
  "OC",
  "Sector",
  "RUC",
  "Cliente",
  "Negocio",
  "Línea",
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
    "Backlog",
    1,
    3,
    "OV-100245",
    "2026-01-15",
    "2026-01-20",
    "FAC-7788",
    "2026-01-29",
    "OC-88901",
    "Industrial",
    "20601234567",
    "Cliente Demo SAC",
    "Energia",
    "Tableros",
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
    75,
    168000,
    180000,
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
    { header: "Campo", key: "field", width: 24 },
    { header: "Uso", key: "usage", width: 64 },
  ];
  guideSheet.getRow(1).font = { bold: true };
  guideSheet.addRows([
    ["Fecha registro / adjudicacion / facturacion", "Usa formato ISO `YYYY-MM-DD` o una fecha Excel valida."],
    ["Mes / Semana", "Si vienen informados y son validos, se respetan. Si no, se derivan de la fecha base."],
    ["Cliente", "Obligatorio. Si viene vacio, la fila se marca con error."],
    ["RUC", "Se guarda junto al cliente cuando venga informado."],
    ["Probabilidad", "Acepta `0-1` o `0-100`. El sistema recalcula `forecast_ponderado`."],
    ["Ventas S/", "Monto principal de la oportunidad o facturacion."],
    ["Proyeccion", "Si se deja vacio, se usa el valor de ventas."],
    ["BL / Proy", "Se usa como tipo de pipeline. Si no viene, se toma la columna `Pipeline`."],
    ["Licitaciones", "Acepta `Si`, `Yes`, `True`, `1` o `X`."],
    ["Dimension1 / Dimension2 / Dimension 3", "Por ahora quedan preservadas en `raw_ax_rows` y no se normalizan en `fact_comercial`."],
    ["Anio de carga", "Se elige en la interfaz al subir el archivo y queda guardado en la tabla `imports`."],
  ]);

  return workbook.xlsx.writeBuffer();
}
