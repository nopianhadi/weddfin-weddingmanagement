import { useState, useEffect, useCallback, useRef } from 'react';

interface InfiniteScrollOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>;
  limit?: number;
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  enabled?: boolean;
}

interface InfiniteScrollState<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  total?: number;
  error: string | null;
}

export function useInfiniteScroll<T>(options: InfiniteScrollOptions<T>) {
  const { fetchFn, limit = 20, threshold = 200, enabled = true } = options;
  
  const [state, setState] = useState<InfiniteScrollState<T>>({
    items: [],
    loading: false,
    hasMore: true,
    page: 0,
    total: undefined,
    error: null
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const isInitialLoad = useRef(true);

  const loadMore = useCallback(async (isInitial = false) => {
    if (state.loading || (!state.hasMore && !isInitial)) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const nextPage = isInitial ? 1 : state.page + 1;
      const result = await fetchFn(nextPage, limit);
      
      setState(prev => ({
        ...prev,
        items: isInitial ? result.data : [...prev.items, ...result.data],
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

  // Initial load
  useEffect(() => {
    if (enabled && isInitialLoad.current) {
      isInitialLoad.current = false;
      loadMore(true);
    }
  }, [enabled, loadMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!enabled || !loadingRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && state.hasMore && !state.loading) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, threshold, state.hasMore, state.loading, loadMore]);

  const reset = useCallback(() => {
    setState({
      items: [],
      loading: false,
      hasMore: true,
      page: 0,
      total: undefined,
      error: null
    });
    isInitialLoad.current = true;
  }, []);

  const retry = useCallback(() => {
    if (state.items.length === 0) {
      reset();
    } else {
      loadMore();
    }
  }, [state.items.length, reset, loadMore]);

  return {
    ...state,
    loadMore: () => loadMore(),
    reset,
    retry,
    loadingRef
  };
}