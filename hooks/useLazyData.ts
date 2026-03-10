import { useState, useEffect, useCallback } from 'react';

interface LazyDataOptions<T> {
  fetchFn: () => Promise<T>;
  dependencies?: any[];
  immediate?: boolean;
}

export function useLazyData<T>(options: LazyDataOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await options.fetchFn();
      setData(result);
      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [options.fetchFn, loading]);

  useEffect(() => {
    if (options.immediate && !loaded) {
      load();
    }
  }, [options.immediate, loaded, load]);

  useEffect(() => {
    if (options.dependencies && loaded) {
      load();
    }
  }, options.dependencies);

  return {
    data,
    loading,
    error,
    loaded,
    load,
    reload: load
  };
}