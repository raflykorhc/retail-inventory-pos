import type { Request, Response } from "express";
import { PrintService } from "../services/PrintService.ts";

export class PrintController {
  static async thermalPrint(req: Request, res: Response) {
    const { ip, port, data } = req.body;
    const result = await PrintService.sendToPrinter(ip, port || 9100, data);
    res.json(result);
  }
}
