import { useInfiniteQuery } from "@tanstack/react-query";

export const useCustomerHistory = (customerId: string | undefined, limit: number = 10) => {
  return useInfiniteQuery({
    queryKey: ["customer-history", customerId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(`/api/customers/${customerId}/history?page=${pageParam}&limit=${limit}`);
      if (!res.ok) {
        throw new Error("Failed to fetch customer history");
      }
      return res.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.items) return undefined;
      const { page, limit, total } = lastPage;
      const totalPages = Math.ceil(total / limit);
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!customerId,
  });
};
