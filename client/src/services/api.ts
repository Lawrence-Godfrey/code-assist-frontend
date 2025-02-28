import { ApiResponse } from '@/types/schema';

export class ApiError extends Error {
  status: number;
  
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, `${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    await throwIfResNotOk(res);
    
    // For HEAD requests or when no content is expected
    if (method === 'HEAD' || res.status === 204) {
      return {} as T;
    }
    
    return await res.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Network error: ${(error as Error).message}`);
  }
}

// API helper methods for common operations
export const api = {
  get: <T>(url: string) => apiRequest<T>('GET', url),
  post: <T>(url: string, data?: unknown) => apiRequest<T>('POST', url, data),
  put: <T>(url: string, data?: unknown) => apiRequest<T>('PUT', url, data),
  patch: <T>(url: string, data?: unknown) => apiRequest<T>('PATCH', url, data),
  delete: <T>(url: string) => apiRequest<T>('DELETE', url),
};