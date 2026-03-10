import { useState, useCallback } from 'react';

interface LazyDataState<T> {
  data: T[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

interface LazyDataLoaderOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>;
  initialLimit?: number;
  pageSize?: number;
}

export function useLazyDataLoader<T>(options: LazyDataLoaderOptions<T>) {
  const { fetchFn, initialLimit = 20, pageSize = 20 } = options;
  
  const [state, setState] = useState<LazyDataState<T>>({
    data: [],
    loading: false,
    loaded: false,
    error: null,
    hasMore: true,
    page: 0
  });

  const loadInitial = useCallback(async () => {
    if (state.loading || state.loaded) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await fetchFn(1, initialLimit);
      setState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        loaded: true,
        hasMore: result.hasMore,
        page: 1
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [fetchFn, initialLimit, state.loading, state.loaded]);

  const loadMore = useCallback(async () => {
    if (state.loading || !state.hasMore) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const nextPage = state.page + 1;
      const result = await fetchFn(nextPage, pageSize);
      setState(prev => ({
        ...prev,
        data: [...prev.data, ...result.data],
        loading: false,
        hasMore: result.hasMore,
        page: nextPage
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [fetchFn, pageSize, state.loading, state.hasMore, state.page]);

  const reload = useCallback(async () => {
    setState({
      data: [],
      loading: false,
      loaded: false,
      error: null,
      hasMore: true,
      page: 0
    });
    await loadInitial();
  }, [loadInitial]);

  return {
    ...state,
    loadInitial,
    loadMore,
    reload
  };
}