import { SalesController } from "./SalesController";
import { SalesService } from "../services/SalesService";
import { Request, Response } from "express";

// Mock the Service
jest.mock("../services/SalesService");

describe("SalesController", () => {
  let req: Partial<any>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    req = { 
      query: {}, 
      body: {}, 
      user: { id: "user-123" } 
    };
    res = { 
      json: jsonMock 
    } as any;
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should successfully create a sale and return JSON", async () => {
      const mockSaleResult = { id: "sale-1", invoiceNumber: "INV-001" };
      (SalesService.create as jest.Mock).mockResolvedValue(mockSaleResult);
      
      req.body = { 
        items: [{ id: "p1", quantity: 1 }], 
        totalAmount: 5000,
        paymentMethod: "CASH"
      };

      await SalesController.create(req as any, res as Response);

      expect(SalesService.create).toHaveBeenCalledWith({
        items: [{ id: "p1", quantity: 1 }],
        totalAmount: 5000,
        paymentMethod: "CASH",
        userId: "user-123"
      });
      expect(jsonMock).toHaveBeenCalledWith(mockSaleResult);
    });
  });

  describe("getAll", () => {
    it("should call SalesService.getReport with parsed filters", async () => {
      const mockReport = { items: [], total: 0 };
      (SalesService.getReport as jest.Mock).mockResolvedValue(mockReport);
      
      req.query = { 
        customerId: "cust-1",
        page: "2",
        limit: "10"
      };

      await SalesController.getAll(req as Request, res as Response);

      expect(SalesService.getReport).toHaveBeenCalledWith(expect.objectContaining({
        customerId: "cust-1",
        page: 2,
        limit: 10
      }));
      expect(jsonMock).toHaveBeenCalledWith(mockReport);
    });
  });

  describe("getSummary", () => {
    it("should call SalesService.getSummary with filters", async () => {
      (SalesService.getSummary as jest.Mock).mockResolvedValue({ totalRevenue: 1000 });
      
      req.query = { startDate: "2024-01-01" };

      await SalesController.getSummary(req as Request, res as Response);

      expect(SalesService.getSummary).toHaveBeenCalledWith(expect.objectContaining({
        startDate: "2024-01-01"
      }));
    });
  });
});
