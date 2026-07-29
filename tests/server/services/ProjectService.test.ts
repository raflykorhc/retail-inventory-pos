import { ProjectService } from "./ProjectService";
import prisma from "../config/db";
import { ApiError } from "../utils/ApiError";

jest.mock("../config/db", () => ({
  __esModule: true,
  default: {
    project: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("ProjectService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a project", async () => {
      const mockData = {
        customerId: "cust-1",
        projectName: "Renovasi Rumah",
        location: "Jakarta",
        budget: 50000000
      };

      (prisma.project.create as jest.Mock).mockResolvedValue({ id: "proj-1", ...mockData });

      const result = await ProjectService.create(mockData);

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: "cust-1",
          projectName: "Renovasi Rumah",
          budget: 50000000,
          status: "ACTIVE"
        })
      });
      expect(result.id).toBe("proj-1");
    });

    it("should throw error if customer or name is missing", async () => {
      await expect(ProjectService.create({ customerId: "", projectName: "Test" })).rejects.toThrow(ApiError);
    });
  });

  describe("update", () => {
    it("should update project details", async () => {
      (prisma.project.update as jest.Mock).mockResolvedValue({ id: "proj-1" });

      await ProjectService.update("proj-1", { budget: 60000000, status: "COMPLETED" });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj-1" },
        data: expect.objectContaining({
          budget: 60000000,
          status: "COMPLETED"
        })
      });
    });
  });

  describe("delete", () => {
    it("should hard delete a project", async () => {
      (prisma.project.delete as jest.Mock).mockResolvedValue({ id: "proj-1" });

      const res = await ProjectService.delete("proj-1");

      expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "proj-1" } });
      expect(res.success).toBe(true);
    });
  });
});
