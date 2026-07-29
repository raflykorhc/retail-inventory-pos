/** @jest-environment node */
import request from 'supertest';

// Mock vite before importing server
jest.mock('vite', () => ({
  createServer: jest.fn().mockResolvedValue({
    middlewares: (req: any, res: any, next: any) => next()
  })
}));

import { createServer, prisma } from './server';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn().mockReturnValue({ id: 'test-user', username: 'admin', role: 'ADMIN' }),
}));

// Mocking Prisma
jest.mock('@prisma/client', () => {
  const mPrisma = {
    product: {
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    sale: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    debt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

describe('Express API Endpoints', () => {
  let app: Express;
  const token = 'Bearer valid-token';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('should return a list of products', async () => {
      const mockProducts = [{ id: '1', name: 'Product 1' }];
      (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return 500 if prisma fails', async () => {
      (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('Prisma error'));

      const response = await request(app)
        .get('/api/products')
        .set('Authorization', token);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch products' });
    });
  });

  describe('POST /api/customers', () => {
    it('should create a new customer', async () => {
      const newCustomer = { name: 'John Doe', phone: '08123456789' };
      const mockCustomer = { id: '1', ...newCustomer };
      (prisma.customer.create as jest.Mock).mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', token)
        .send(newCustomer);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCustomer);
      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: {
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: undefined,
          email: undefined,
          billingDate: null,
          notes: undefined,
          isContractor: false,
          creditLimit: null
        }
      });
    });
  });

  describe('GET /api/categories', () => {
    it('should return a list of categories', async () => {
      const mockCategories = [{ id: '1', name: 'Category 1' }];
      (prisma.category.findMany as jest.Mock).mockResolvedValue(mockCategories);

      const response = await request(app)
        .get('/api/categories')
        .set('Authorization', token);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCategories);
    });
  });

  describe('GET /api/sales', () => {
    it('should return a list of sales', async () => {
      const mockSales = [{ id: '1', invoiceNumber: 'INV-001', totalAmount: 100000 }];
      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockSales);

      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', token);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSales);
    });
  });

  describe('GET /api/debts', () => {
    it('should return a list of debts', async () => {
      const mockDebts = [{ id: '1', amountDue: 100000, remainingBalance: 50000 }];
      (prisma.debt.findMany as jest.Mock).mockResolvedValue(mockDebts);

      const response = await request(app)
        .get('/api/debts')
        .set('Authorization', token);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockDebts);
    });
  });

  describe('POST /api/debts/:id/remind', () => {
    it('should send a reminder and update lastReminderSent', async () => {
      const mockDebt = { 
        id: '1', 
        lastReminderSent: null, 
        remainingBalance: 50000, 
        dueDate: new Date().toISOString(),
        sale: { 
          customer: { name: 'John Doe', email: 'john@example.com' } 
        } 
      };
      (prisma.debt.findUnique as jest.Mock).mockResolvedValue(mockDebt);
      (prisma.debt.update as jest.Mock).mockResolvedValue({ ...mockDebt, lastReminderSent: new Date() });

      const response = await request(app)
        .post('/api/debts/1/remind')
        .set('Authorization', token);
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Pengingat berhasil dikirim');
      expect(prisma.debt.update).toHaveBeenCalled();
    });
  });

  describe('GET /api/customers/:id/history', () => {
    it('should return customer transaction history', async () => {
      const mockHistory = [{ id: '1', type: 'SALE', amount: 100000 }];
      (prisma.sale.findMany as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/customers/1/history')
        .set('Authorization', token);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockHistory);
    });
  });
});
