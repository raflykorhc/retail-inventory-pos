import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" }
    });
    res.json(suppliers);
  } catch (error) {
    console.error("Get Suppliers Error:", error);
    res.status(500).json({ error: "Failed to get suppliers" });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contact, phone, address, email } = req.body;
    const supplier = await prisma.supplier.create({
      data: { name, contact, phone, address, email }
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error("Create Supplier Error:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, contact, phone, address, email } = req.body;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { name, contact, phone, address, email }
    });
    res.json(supplier);
  } catch (error) {
    console.error("Update Supplier Error:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.supplier.delete({
      where: { id }
    });
    res.json({ message: "Supplier deleted" });
  } catch (error) {
    console.error("Delete Supplier Error:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
};
