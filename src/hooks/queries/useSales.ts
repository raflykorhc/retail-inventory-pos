import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axiosClient from '../../lib/axiosClient';

export const useSales = (filters: any = {}) => {
  return useQuery({
    queryKey: ['sales', filters],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/sales', { params: filters });
      return res.data;
    },
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
