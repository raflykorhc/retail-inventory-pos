import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import axiosClient from '../../lib/axiosClient';

export const useSales = (filters: any = {}) => {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/sales', { params: filters });
      return res.data;
    },
    placeholderData: (previousData) => previousData,
  });
};

export const useSalesSummary = (filters: any = {}) => {
  return useQuery({
    queryKey: ['sales-summary', filters],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/sales/summary', { params: filters });
      return res.data;
    },
  });
};

export const useSaleDetail = (idOrInvoice: string | null) => {
  return useQuery({
    queryKey: ['sale-detail', idOrInvoice],
    queryFn: async () => {
      if (!idOrInvoice) return null;
      const res = await axiosClient.get(`/sales/${idOrInvoice}`);
      return res.data;
    },
    enabled: !!idOrInvoice,
  });
};

export const useCheckout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (saleData: any) => {
      const res = await axiosClient.post('/sales', saleData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });

      toast.success("Transaksi Berhasil", {
        description: "Data penjualan telah tersimpan dalam sistem.",
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Gagal memproses transaksi. Silakan coba lagi.";
      toast.error("Transaksi Gagal", {
        description: message,
      });
    },
  });
};

