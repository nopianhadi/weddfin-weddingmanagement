import { useState, useCallback, useEffect } from 'react';
import { useOptimizedData } from './useOptimizedData';
import { usePaginatedData } from './usePaginatedData';

// Lightweight data untuk dashboard
export function useDashboardData() {
  return useOptimizedData({
    fetchFn: async () => {
      const { getDashboardStats, getRecentActivity } = await import('../services/optimized-queries');
      const [stats, recentActivity] = await Promise.all([
        getDashboardStats(),
        getRecentActivity()
      ]);
      return { stats, recentActivity };
    },
    cacheKey: 'dashboard_data',
    cacheDuration: 5, // 5 minutes cache
    immediate: true
  });
}

// Lazy loading untuk projects
export function useProjectsData() {
  return usePaginatedData({
    fetchFn: async (page, limit) => {
      const { listProjectsPaginated } = await import('../services/projects');
      const result = await listProjectsPaginated(page, limit);
      return {
        data: result.projects,
        total: result.total,
        hasMore: result.hasMore
      };
    },
    limit: 20,
    immediate: false // Load on demand
  });
}

// Lazy loading untuk clients
export function useClientsData() {
  return usePaginatedData({
    fetchFn: async (page, limit) => {
      const { listClientsPaginated } = await import('../services/clients');
      const result = await listClientsPaginated(page, limit);
      return {
        data: result.clients,
        total: result.total,
        hasMore: result.hasMore
      };
    },
    limit: 20,
    immediate: false
  });
}

// Optimized data untuk komponen yang sering diakses
export function useEssentialData() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    teamMembers: any[];
    packages: any[];
    addOns: any[];
  }>({
    teamMembers: [],
    packages: [],
    addOns: []
  });

  const loadEssentialData = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Load only essential data with limits
      const [teamMembersModule, packagesModule, addOnsModule] = await Promise.all([
        import('../services/teamMembers'),
        import('../services/packages'),
        import('../services/addOns')
      ]);

      const [teamMembers, packages, addOns] = await Promise.all([
        teamMembersModule.listTeamMembers(),
        packagesModule.listPackages(),
        addOnsModule.listAddOns()
      ]);

      setData({ teamMembers, packages, addOns });
    } catch (error) {
      console.warn('Failed to load essential data:', error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return {
    data,
    loading,
    loadEssentialData
  };
}