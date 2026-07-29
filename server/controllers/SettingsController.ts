import type { Request, Response } from "express";
import { SettingsService } from "../services/SettingsService.ts";

export class SettingsController {
  static getSettings(req: Request, res: Response) {
    const settings = SettingsService.getSettings();
    res.json(settings);
  }

  static async saveSettings(req: any, res: Response) {
    const settings = await SettingsService.saveSettings(req.body, req.user?.id);
    res.json(settings);
  }
}
