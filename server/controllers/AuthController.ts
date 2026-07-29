import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService.ts";

export class AuthController {
  static async register(req: any, res: Response) {
    const result = await AuthService.register(req.body, req.user?.id);
    res.status(201).json(result);
  }

  static async login(req: Request, res: Response) {
    const ip = req.ip || req.socket.remoteAddress;
    const result = await AuthService.login(req.body, ip);
    res.json(result);
  }

  static async me(req: any, res: Response) {
    res.json(req.user);
  }
  static async listUsers(req: Request, res: Response) {
    const result = await AuthService.getAllUsers();
    res.json(result);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const result = await AuthService.updateUser(id, req.body, req.user?.id);
    res.json(result);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    await AuthService.deleteUser(id, req.user?.id);
    res.status(204).send();
  }
}
