import { z } from "zod";

export const acceptedImportMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const acceptedImportExtensions = [".xlsx"] as const;

export const uploadFileSchema = z.object({
  name: z.string().min(1),
  size: z.number().positive().max(100 * 1024 * 1024),
  type: z.string().optional(),
});

export const importYearSchema = z.coerce
  .number()
  .int()
  .min(2020, "El año minimo soportado es 2020.")
  .max(2100, "El año maximo soportado es 2100.");

export const updateImportSchema = z.object({
  anio: importYearSchema,
});

export const updateFactRowSchema = z.object({
  anio: importYearSchema.nullable(),
  mes: z.coerce.number().int().min(1).max(12).nullable(),
  trimestre: z.coerce.number().int().min(1).max(4).nullable(),
  semana: z.coerce.number().int().min(1).max(53).nullable(),
  fecha_registro: z.string().trim().nullable(),
  fecha_adjudicacion: z.string().trim().nullable(),
  fecha_facturacion: z.string().trim().nullable(),
  situacion: z.string().trim().max(200).nullable(),
  orden_venta: z.string().trim().max(200).nullable(),
  factura: z.string().trim().max(200).nullable(),
  oc: z.string().trim().max(200).nullable(),
  cliente_nombre: z.string().trim().max(300).nullable(),
  cliente_ruc: z.string().trim().max(32).nullable(),
  sector_ax_nombre: z.string().trim().max(200).nullable(),
  sector_nombre: z.string().trim().max(200).nullable(),
  negocio_nombre: z.string().trim().max(200).nullable(),
  linea_nombre: z.string().trim().max(200).nullable(),
  sublinea_nombre: z.string().trim().max(200).nullable(),
  grupo_nombre: z.string().trim().max(200).nullable(),
  ejecutivo_nombre: z.string().trim().max(200).nullable(),
  proyecto: z.string().trim().max(300).nullable(),
  codigo_articulo: z.string().trim().max(200).nullable(),
  articulo: z.string().trim().max(300).nullable(),
  etapa: z.string().trim().max(200).nullable(),
  um: z.string().trim().max(50).nullable(),
  motivo_perdida: z.string().trim().max(300).nullable(),
  tipo_pipeline: z.string().trim().max(200).nullable(),
  licitacion_flag: z.boolean(),
  cantidad: z.coerce.number().nullable(),
  ventas_monto: z.coerce.number().nullable(),
  proyeccion_monto: z.coerce.number().nullable(),
  costo_monto: z.coerce.number().nullable(),
  margen_monto: z.coerce.number().nullable(),
  porcentaje_num: z.coerce.number().nullable(),
  probabilidad_num: z.coerce.number().min(0).max(100).nullable(),
  observaciones: z.string().trim().max(4000).nullable(),
});

export const updateAccountingRowSchema = z.object({
  linea: z.string().trim().max(300).nullable(),
  anio_anterior_real: z.coerce.number().nullable(),
  anio_actual_ppto: z.coerce.number().nullable(),
  anio_actual_real: z.coerce.number().nullable(),
  mb: z.coerce.number().nullable(),
  negocio: z.string().trim().max(200).nullable(),
  periodo_desde: z.string().trim().max(50).nullable(),
  periodo_hasta: z.string().trim().max(50).nullable(),
  periodo: z.string().trim().max(120).nullable(),
});

export function validateImportFile(file: File) {
  const parsed = uploadFileSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!parsed.success) {
    throw new Error("El archivo no cumple con las validaciones de carga.");
  }

  const fileName = file.name.toLowerCase();
  const hasValidExtension = acceptedImportExtensions.some((extension) =>
    fileName.endsWith(extension),
  );

  if (!hasValidExtension) {
    throw new Error("Solo se admiten archivos .xlsx en la importacion actual.");
  }

  if (file.type && !acceptedImportMimeTypes.includes(file.type as (typeof acceptedImportMimeTypes)[number])) {
    throw new Error("El archivo no tiene un formato Excel .xlsx valido.");
  }
}
