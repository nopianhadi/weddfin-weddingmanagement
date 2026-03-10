import { useState, useCallback } from 'react';

interface PaginationState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  total: number;
}

interface UsePaginationOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<{
    data: T[];
    total: number;
    hasMore: boolean;
  }>;
  limit?: number;
  initialLoad?: boolean;
}

export function usePagination<T>(options: UsePaginationOptions<T>) {
  const [state, setState] = useState<PaginationState<T>>({
    data: [],
    loading: false,
    error: null,
    hasMore: true,
    page: 0,
    total: 0
  });

  const load = useCallback(async (reset: boolean = false) => {
    const nextPage = reset ? 1 : state.page + 1;
    
    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      ...(reset ? { data: [], page: 0 } : {})
    }));

    try {
      const result = await options.fetchFn(nextPage, options.limit || 20);
      
      setState(prev => ({
        ...prev,
        data: reset ? result.data : [...prev.data, ...result.data],
        loading: false,
        hasMore: result.hasMore,
        page: nextPage,
        total: result.total
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Unknown error'),
        loading: false
      }));
    }
  }, [state.page, options.fetchFn, options.limit]);

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      load(false);
    }
  }, [load, state.loading, state.hasMore]);

  const reload = useCallback(() => {
    load(true);
  }, [load]);

  return {
    ...state,
    loadMore,
    reload,
    initialLoad: () => load(true)
  };
}