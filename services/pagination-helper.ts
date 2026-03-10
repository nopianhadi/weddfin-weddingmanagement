// Helper untuk pagination dan limit query
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export function calculatePagination(options: PaginationOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(10, options.limit || 20)); // Max 100, default 20
  const offset = options.offset ?? (page - 1) * limit;
  
  return { page, limit, offset };
}

export function createPaginatedResult<T>(
  data: T[], 
  total: number, 
  page: number, 
  limit: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit,
    hasMore: (page * limit) < total
  };
}