import type { Request, Response } from "express";
import { ProjectService } from "../services/ProjectService.ts";

export class ProjectController {
  static async getAll(req: Request, res: Response) {
    const { customerId } = req.query;
    const projects = await ProjectService.getAll(customerId as string);
    res.json(projects);
  }

  static async create(req: any, res: Response) {
    const project = await ProjectService.create(req.body, req.user?.id);
    res.json(project);
  }

  static async update(req: any, res: Response) {
    const { id } = req.params;
    const project = await ProjectService.update(id, req.body, req.user?.id);
    res.json(project);
  }

  static async delete(req: any, res: Response) {
    const { id } = req.params;
    const result = await ProjectService.delete(id, req.user?.id);
    res.json(result);
  }

  static async getReport(req: Request, res: Response) {
    const { id } = req.params;
    const report = await ProjectService.getReport(id);
    res.json(report);
  }
}
