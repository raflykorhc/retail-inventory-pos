import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import axiosClient from '../../lib/axiosClient';

export const useProducts = (filters?: { search?: string; categoryId?: string; supplierId?: string; abcCategory?: string; stockStatus?: string; page?: number; limit?: number; sort?: string }) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);
      if (filters?.supplierId) params.append('supplierId', filters.supplierId);
      if (filters?.abcCategory) params.append('abcCategory', filters.abcCategory);
      if (filters?.stockStatus) params.append('stockStatus', filters.stockStatus);
      if (filters?.page) params.append('page', String(filters.page));
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.sort) params.append('sort', filters.sort);
      
      const queryString = params.toString();
      const res = await axiosClient.get(queryString ? `/products?${queryString}` : '/products');
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
};

export const useInfiniteProducts = (filters?: { search?: string; categoryId?: string; supplierId?: string; limit?: number; sort?: string }) => {
  return useInfiniteQuery({
    queryKey: ['infinite-products', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.append('page', String(pageParam));
      params.append('limit', String(filters?.limit || 24));
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);
      if (filters?.supplierId) params.append('supplierId', filters.supplierId);
      if (filters?.sort) params.append('sort', filters.sort);

      const queryString = params.toString();
      const res = await axiosClient.get(`/products?${queryString}`);
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      // Assuming the backend returns { items, total, page, limit }
      if (!lastPage || !lastPage.items) return undefined;
      const { page, limit, total } = lastPage;
      const totalPages = Math.ceil(total / limit);
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    placeholderData: keepPreviousData,
  });
};

export const useAddStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, quantity, cost, unitId, conversionFactor }: { id: string; quantity: number; cost?: number; unitId?: string; conversionFactor?: number }) => {
      const res = await axiosClient.post(`/products/${id}/stock`, { quantity, cost, unitId, conversionFactor });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
      toast.success("Stok Ditambahkan", {
        description: `Berhasil menambah stok untuk ${data.name || 'produk'}.`,
      });
    },
    onError: (error: any) => {
      toast.error("Gagal Tambah Stok", {
        description: error.response?.data?.error || "Terjadi kesalahan saat menambah stok.",
      });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await axiosClient.put(`/products/${id}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
      toast.success("Produk Diperbarui", {
        description: `Data ${data.name || 'produk'} berhasil diperbarui.`,
      });
    },
    onError: (error: any) => {
      toast.error("Gagal Memperbarui Produk", {
        description: error.response?.data?.error || "Terjadi kesalahan saat memperbarui produk.",
      });
    }
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosClient.post('/products', data);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success("Produk Baru", {
        description: `Produk ${data.name} berhasil ditambahkan ke inventaris.`,
      });
    },
    onError: (error: any) => {
      toast.error("Gagal Membuat Produk", {
        description: error.response?.data?.error || "Terjadi kesalahan saat membuat produk baru.",
      });
    }
  });
};

export const useProductLogs = (productId: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['product-logs', productId, page, limit],
    queryFn: async () => {
      if (!productId) return { items: [], total: 0 };
      const res = await axiosClient.get(`/products/${productId}/logs`, {
        params: { page, limit }
      });
      return res.data;
    },
    enabled: !!productId,
  });
};

export const useProductBatches = (productId: string, activeOnly: boolean = false) => {
  return useQuery({
    queryKey: ['product-batches', productId, activeOnly],
    queryFn: async () => {
      if (!productId) return [];
      const res = await axiosClient.get(`/products/${productId}/batches`, {
        params: { activeOnly }
      });
      return res.data;
    },
    enabled: !!productId,
  });
};
