import { useState, useEffect, useCallback } from 'react';
import { advancedCache, CacheKeys } from '../utils/advancedCache';

interface UseCacheOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  version?: string;
  dependencies?: string[];
  enabled?: boolean;
  staleWhileRevalidate?: boolean;
}

export function useAdvancedCache<T>({
  key,
  fetcher,
  ttl,
  version,
  dependencies,
  enabled = true,
  staleWhileRevalidate = true
}: UseCacheOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async (useCache = true) => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try cache first
      if (useCache) {
        const cached = advancedCache.get<T>(key, version);
        if (cached) {
          setData(cached);
          setIsLoading(false);
          
          // If stale-while-revalidate, fetch fresh data in background
          if (staleWhileRevalidate) {
            setIsStale(true);
            fetchData(false); // Fetch without cache
          }
          return;
        }
      }

      // Fetch fresh data
      const freshData = await fetcher();
      
      // Cache the result
      advancedCache.set(key, freshData, {
        ttl,
        version,
        dependencies
      });

      setData(freshData);
      setIsStale(false);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, version, dependencies, enabled, staleWhileRevalidate]);

  const invalidate = useCallback(() => {
    advancedCache.delete(key);
    fetchData(false);
  }, [key, fetchData]);

  const refresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isStale,
    invalidate,
    refresh
  };
}

// Specialized hooks for common use cases
export function useCachedProjects(userId: string, filters?: any) {
  return useAdvancedCache({
    key: CacheKeys.projects(userId, filters),
    fetcher: async () => {
      // This would call your optimized projects service
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, filters })
      });
      return response.json();
    },
    ttl: 2 * 60 * 1000, // 2 minutes
    dependencies: ['projects', 'clients'],
    staleWhileRevalidate: true
  });
}

export function useCachedDashboardStats(userId: string) {
  return useAdvancedCache({
    key: CacheKeys.dashboardStats(userId),
    fetcher: async () => {
      // Call Edge Function for dashboard stats
      const response = await fetch('/functions/v1/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });
      return response.json();
    },
    ttl: 5 * 60 * 1000, // 5 minutes
    dependencies: ['projects', 'transactions'],
    staleWhileRevalidate: true
  });
}

export function useCachedAnalytics(
  userId: string, 
  timeframe: string = '30', 
  projectType?: string
) {
  return useAdvancedCache({
    key: CacheKeys.projectAnalytics(userId, timeframe, projectType),
    fetcher: async () => {
      // Call Edge Function for analytics
      const params = new URLSearchParams({
        timeframe,
        ...(projectType && { projectType })
      });
      
      const response = await fetch(`/functions/v1/project-analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });
      return response.json();
    },
    ttl: 10 * 60 * 1000, // 10 minutes
    dependencies: ['projects', 'team_payments'],
    staleWhileRevalidate: true
  });
}