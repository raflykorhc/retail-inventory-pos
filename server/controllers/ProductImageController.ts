import type { Request, Response } from "express";
import prisma from "../config/db.ts";

export class ProductImageController {
  static async getImage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const productImage = await prisma.productImage.findUnique({
        where: { productId: id }
      });

      if (!productImage || !productImage.data) {
        return res.status(404).json({ message: "Image not found" });
      }

      res.setHeader('Content-Type', productImage.mimeType || 'image/jpeg');
      // Disable aggressive caching so updated images show immediately
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(productImage.data);
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
