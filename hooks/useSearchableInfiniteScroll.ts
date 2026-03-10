import { useState, useCallback, useEffect } from 'react';
import { useInfiniteScroll } from './useInfiniteScroll';
import { useDebounce } from './useDebounce';

interface SearchableInfiniteScrollOptions<T> {
  fetchFn: (
    page: number, 
    limit: number, 
    searchQuery?: string, 
    filters?: any
  ) => Promise<{ data: T[]; hasMore: boolean; total?: number }>;
  limit?: number;
  searchDelay?: number;
  enabled?: boolean;
}

export function useSearchableInfiniteScroll<T>(options: SearchableInfiniteScrollOptions<T>) {
  const { fetchFn, limit = 20, searchDelay = 300, enabled = true } = options;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const debouncedSearchQuery = useDebounce(searchQuery, searchDelay);

  // Create fetch function with search and filters
  const fetchWithSearch = useCallback(
    (page: number, pageLimit: number) => {
      return fetchFn(page, pageLimit, debouncedSearchQuery, filters);
    },
    [fetchFn, debouncedSearchQuery, filters]
  );

  const infiniteScroll = useInfiniteScroll({
    fetchFn: fetchWithSearch,
    limit,
    enabled
  });

  // Reset when search or filters change
  useEffect(() => {
    if (enabled) {
      infiniteScroll.reset();
    }
  }, [debouncedSearchQuery, filters, enabled]);

  const updateSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const updateFilters = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    ...infiniteScroll,
    searchQuery,
    filters,
    updateSearch,
    updateFilters,
    clearFilters,
    clearSearch,
    isSearching: searchQuery !== debouncedSearchQuery
  };
}