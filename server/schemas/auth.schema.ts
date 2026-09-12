import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    username: z.string()
      .min(1, "Username wajib diisi")
      .min(3, "Username minimal 3 karakter"),
    password: z.string()
      .min(1, "Password wajib diisi")
      .min(6, "Password minimal 6 karakter"),
    fullName: z.string()
      .min(1, "Nama lengkap wajib diisi"),
    role: z.enum(["OWNER", "CASHIER", "ADMIN", "MANAGER"]).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username wajib diisi"),
    password: z.string().min(1, "Password wajib diisi"),
  }),
});
