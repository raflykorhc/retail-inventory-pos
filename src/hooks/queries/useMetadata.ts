import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../lib/axiosClient';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axiosClient.get('/categories');
      return res.data;
    },
  });
};

export const useUnits = () => {
  return useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await axiosClient.get('/units');
      return res.data;
    },
  });
};

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await axiosClient.get('/suppliers');
      return res.data;
    },
  });
};
