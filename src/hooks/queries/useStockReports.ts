import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axiosClient from '../../lib/axiosClient';

export interface StockSummaryData {
  totalAssetValue: number;
  totalItems: number;
  outOfStockCount: number;
  lowStockCount: number;
  overStockCount: number;
  normalStockCount: number;
  totalProducts: number;
  reorderTotalUnits?: number;
  reorderTotalCost?: number;
  abcCounts: {
    A: number;
    B: number;
    C: number;
    unclassified: number;
  };
  todayMovements: {
    inQty: number;
    outQty: number;
    totalLogs: number;
  };
  valuationBySupplier: Array<{
    name: string;
    value: number;
  }>;
}

export const useStockSummary = () => {
  return useQuery<StockSummaryData>({
    queryKey: ['stock-summary'],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/stock/summary');
      return res.data;
    },
    staleTime: 30000,
  });
};

export interface StockMovementsFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export const useStockMovements = (filters: StockMovementsFilters = {}) => {
  return useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/stock/movements', { params: filters });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
};
