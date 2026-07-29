import { useQuery, keepPreviousData } from '@tanstack/react-query';
import axiosClient from '../../lib/axiosClient';

// Hook untuk mendapatkan Ringkasan Pengeluaran (Statistik)
export const useExpenseSummary = (filters?: { startDate?: string; endDate?: string; search?: string; categoryId?: string }) => {
  return useQuery({
    queryKey: ['expense-summary', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categoryId && filters.categoryId !== 'ALL') params.append('categoryId', filters.categoryId);
      
      const queryString = params.toString();
      const res = await axiosClient.get(queryString ? `/expenses/summary?${queryString}` : '/expenses/summary');
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });
};

// Hook untuk mendapatkan Daftar Pengeluaran (Tabel)
export const useExpenses = (filters?: { startDate?: string; endDate?: string; page?: number; limit?: number; search?: string; categoryId?: string }) => {
  return useQuery({
    queryKey: ['expenses', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categoryId && filters.categoryId !== 'ALL') params.append('categoryId', filters.categoryId);
      
      const queryString = params.toString();
      const res = await axiosClient.get(queryString ? `/expenses?${queryString}` : '/expenses');
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 60000,
  });
};
