export type ExcelCellValue = string | number | boolean | Date | null | undefined;

export type ExcelColumn<T> = {
  header: string;
  key: keyof T;
  width?: number;
};

export async function exportRowsToExcel<T extends object>({
  filename,
  sheetName,
  columns,
  rows,
}: {
  filename: string;
  sheetName: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: String(column.key),
    width: column.width ?? Math.max(14, column.header.length + 2),
  }));

  worksheet.getRow(1).font = { bold: true };
  worksheet.addRows(rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
