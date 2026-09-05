import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../lib/axiosClient';

export interface DashboardStatsFilters {
  startDate?: string;
  endDate?: string;
}

export interface DashboardStatsData {
  metrics: {
    totalRevenue: number;
    revenueTrend: number;
    totalHPP: number;
    grossProfit: number;
    netProfit: number;
    netProfitTrend: number;
    profitMargin: number;
    totalTransactions: number;
    transactionTrend: number;
    averageTransaction: number;
  };
  salesTrend: Array<{ date: string; amount: number; hpp: number }>;
  cashFlow: Array<{ date: string; inflow: number; outflow: number }>;
  topProducts: Array<{ name: string; sales: number; revenue: number }>;
  topCashiers: Array<{ name: string; revenue: number; transactionCount: number }>;
  recentSales?: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    cashierName: string;
    createdAt: string;
    itemCount: number;
  }>;
  insights: {
    lowStock: Array<{ name: string; stock: number; minStock: number }>;
    lowStockCount: number;
  };
}

export const useDashboardStats = (filters: DashboardStatsFilters = {}) => {
  return useQuery<DashboardStatsData>({
    queryKey: ['dashboard-stats', filters],
    queryFn: async () => {
      const res = await axiosClient.get('/dashboard/stats', { params: filters });
      return res.data;
    },
    staleTime: 30000,
  });
};
