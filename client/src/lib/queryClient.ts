import { QueryClient } from "@tanstack/react-query";
import { ApiError } from '@/services/api';

// Configure the query client with default settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't provide a default queryFn - let each service handle its own fetching
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - better for performance while still keeping data fresh
      retry: (failureCount, error) => {
        // Don't retry 4xx errors, only retry network errors and 5xx errors
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2; // Retry other errors up to 2 times
      },
    },
    mutations: {
      retry: false,
    },
  },
});
