import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo valido.").trim(),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres."),
});
