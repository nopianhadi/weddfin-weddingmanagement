import { useState, useCallback, useEffect } from 'react';

interface PaginatedDataOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<{
    data: T[];
    hasMore: boolean;
    total?: number;
  }>;
  limit?: number;
  immediate?: boolean;
}

interface PaginatedDataState<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  total?: number;
  error: string | null;
}

export function usePaginatedData<T>(options: PaginatedDataOptions<T>) {
  const { fetchFn, limit = 20, immediate = true } = options;
  
  const [state, setState] = useState<PaginatedDataState<T>>({
    items: [],
    loading: false,
    hasMore: true,
    page: 0,
    total: undefined,
    error: null
  });

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const nextPage = state.page + 1;
      const result = await fetchFn(nextPage, limit);
      
      setState(prev => ({
        ...prev,
        items: [...prev.items, ...result.data],
        loading: false,
        hasMore: result.hasMore,
        page: nextPage,
        total: result.total ?? prev.total
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [fetchFn, limit, state.loading, state.hasMore, state.page]);

  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      hasMore: true,
      page: 0,
      total: undefined,
      error: null
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (immediate) {
      loadMore();
    }
  }, [immediate]); // Only depend on immediate, not loadMore to avoid infinite loop

  return {
    ...state,
    loadMore,
    reset
  };
}