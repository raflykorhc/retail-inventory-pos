import { useQuery } from '@tanstack/react-query';
import axiosClient from '../../lib/axiosClient';

export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axiosClient.get('/customers');
      return res.data;
    },
  });
};

export const useProjects = (customerId?: string) => {
  return useQuery({
    queryKey: ['projects', customerId],
    queryFn: async () => {
      const res = await axiosClient.get('/projects', {
        params: { customerId }
      });
      return Array.isArray(res.data) ? res.data : [];
    },
  });
};
