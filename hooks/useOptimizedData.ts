import { useState, useEffect, useCallback } from 'react';

interface DataLoadingState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  loaded: boolean;
}

interface UseOptimizedDataOptions<T> {
  fetchFn: () => Promise<T>;
  cacheKey?: string;
  cacheDuration?: number; // in minutes
  immediate?: boolean;
}

export function useOptimizedData<T>(options: UseOptimizedDataOptions<T>): DataLoadingState<T> & {
  load: () => Promise<void>;
  reload: () => Promise<void>;
} {
  const [state, setState] = useState<DataLoadingState<T>>({
    data: null,
    loading: false,
    error: null,
    loaded: false
  });

  const getCachedData = useCallback((): T | null => {
    if (!options.cacheKey) return null;
    
    try {
      const cached = localStorage.getItem(`cache_${options.cacheKey}`);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      const cacheDuration = (options.cacheDuration || 5) * 60 * 1000; // default 5 minutes
      
      if (Date.now() - timestamp < cacheDuration) {
        return data;
      }
      
      // Cache expired
      localStorage.removeItem(`cache_${options.cacheKey}`);
      return null;
    } catch {
      return null;
    }
  }, [options.cacheKey, options.cacheDuration]);

  const setCachedData = useCallback((data: T) => {
    if (!options.cacheKey) return;
    
    try {
      localStorage.setItem(`cache_${options.cacheKey}`, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore cache errors
    }
  }, [options.cacheKey]);

  const load = useCallback(async () => {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      setState(prev => ({ ...prev, data: cachedData, loaded: true }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await options.fetchFn();
      setState(prev => ({ ...prev, data: result, loading: false, loaded: true }));
      setCachedData(result);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error : new Error('Unknown error'),
        loading: false 
      }));
    }
  }, [options.fetchFn, getCachedData, setCachedData]);

  const reload = useCallback(async () => {
    // Clear cache and reload
    if (options.cacheKey) {
      localStorage.removeItem(`cache_${options.cacheKey}`);
    }
    await load();
  }, [load, options.cacheKey]);

  useEffect(() => {
    if (options.immediate) {
      load();
    }
  }, [options.immediate, load]);

  return {
    ...state,
    load,
    reload
  };
}