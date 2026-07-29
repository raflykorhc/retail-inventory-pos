import { z } from "zod";

export const ProductSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, "Nama barang wajib diisi"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  supplierId: z.string().optional(),
  prices: z.array(z.object({
    unitId: z.string().min(1, "Satuan wajib dipilih"),
    price: z.coerce.number().min(0, "Harga harus positif"),
    conversionFactor: z.coerce.number().min(0.000001, "Konversi minimal 0.000001")
  })).min(1, "Minimal satu satuan harus diatur"),
  initialCost: z.coerce.number().min(0, "Harga modal awal harus positif").optional(),
  averageCost: z.coerce.number().min(0, "Harga modal harus positif").optional(),
  minStock: z.coerce.number().min(0, "Stok minimum harus positif"),
  initialStock: z.coerce.number().min(0, "Stok awal harus positif").optional(),
  image: z.string().optional(),
  leadTime: z.coerce.number().min(0, "Lead time harus positif").optional(),
  maxStock: z.coerce.number().min(0, "Stok maksimum harus positif").optional(),
});


export const GenericSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
});

export const SupplierSchema = z.object({
  name: z.string().min(1, "Nama supplier wajib diisi"),
  contact: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
});

export const UserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
  fullName: z.string().min(1, "Nama lengkap wajib diisi"),
  role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
  isActive: z.boolean().default(true),
});

export const CustomerSchema = z.object({
  name: z.string().min(1, "Nama pelanggan wajib diisi"),
  phone: z.string().min(1, "Nomor telepon wajib diisi"),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  address: z.string().optional(),
  isContractor: z.boolean().default(false),
  creditLimit: z.coerce.number().min(0, "Limit kredit harus positif").optional(),
  notes: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof ProductSchema>;
export type GenericFormValues = z.infer<typeof GenericSchema>;
export type SupplierFormValues = z.infer<typeof SupplierSchema>;
export type UserFormValues = z.infer<typeof UserSchema>;
export type CustomerFormValues = z.infer<typeof CustomerSchema>;
