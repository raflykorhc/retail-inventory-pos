import type { Request, Response } from "express";
import { CartService } from "../services/CartService.ts";

export class CartController {
  static async getCart(req: Request, res: Response) {
    const { sessionId } = req.params;
    const cart = await CartService.getBySessionId(sessionId);
    res.json(cart);
  }

  static async syncCart(req: Request, res: Response) {
    const { sessionId, items } = req.body;
    const io = req.app.get("io");
    
    const cart = await CartService.sync(sessionId, items);

    // Emit live update to room
    if (io) {
      io.to(`cart-${sessionId}`).emit("cart-updated", cart);
    }

    res.json(cart);
  }
}
