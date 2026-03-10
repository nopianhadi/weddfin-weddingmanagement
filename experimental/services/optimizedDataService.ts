import { advancedCache, CacheKeys, CacheInvalidation } from '../utils/advancedCache';
import { useOptimizedRealtime } from '../hooks/useOptimizedRealtime';
import supabase from '../lib/supabaseClient';
import { Project, Client, Transaction, TeamMember } from '../types';

class OptimizedDataService {
  private static instance: OptimizedDataService;
  private realtimeConnections = new Map<string, any>();

  static getInstance(): OptimizedDataService {
    if (!OptimizedDataService.instance) {
      OptimizedDataService.instance = new OptimizedDataService();
    }
    return OptimizedDataService.instance;
  }

  // Optimized project fetching with multiple strategies
  async getProjects(
    userId: string,
    options: {
      useCache?: boolean;
      usePagination?: boolean;
      limit?: number;
      offset?: number;
      filters?: any;
      useEdgeFunction?: boolean;
    } = {}
  ): Promise<Project[]> {
    const {
      useCache = true,
      usePagination = true,
      limit = 20,
      offset = 0,
      filters,
      useEdgeFunction = false
    } = options;

    const cacheKey = CacheKeys.projects(userId, { ...filters, limit, offset });

    // Try cache first
    if (useCache) {
      const cached = advancedCache.get<Project[]>(cacheKey);
      if (cached) return cached;
    }

    let projects: Project[];

    if (useEdgeFunction) {
      // Use Edge Function for complex queries
      const response = await fetch('/functions/v1/projects-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          userId,
          limit: usePagination ? limit : undefined,
          offset: usePagination ? offset : undefined,
          filters
        })
      });
      projects = await response.json();
    } else {
      // Use optimized Supabase query
      let query = supabase
        .from('projects')
        .select(`
          id, project_name, client_name, client_id, project_type,
          status, date, total_cost, amount_paid, payment_status,
          progress, location
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (usePagination) {
        query = query.range(offset, offset + limit - 1);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.projectType) {
        query = query.eq('project_type', filters.projectType);
      }

      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map database fields to Project interface
      projects = (data || []).map((item: any) => ({
        ...item,
        projectName: item.project_name,
        clientName: item.client_name,
        clientId: item.client_id,
        projectType: item.project_type,
        totalCost: item.total_cost,
        amountPaid: item.amount_paid,
        paymentStatus: item.payment_status
      }));
    }

    // Cache the result
    if (useCache) {
      advancedCache.set(cacheKey, projects, {
        ttl: 2 * 60 * 1000, // 2 minutes
        dependencies: ['projects'],
        version: '1.0'
      });
    }

    return projects;
  }

  // Optimized dashboard stats using Edge Function
  async getDashboardStats(userId: string, useCache = true): Promise<any> {
    const cacheKey = CacheKeys.dashboardStats(userId);

    if (useCache) {
      const cached = advancedCache.get(cacheKey);
      if (cached) return cached;
    }

    const response = await fetch('/functions/v1/dashboard-stats', {
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });

    const stats = await response.json();

    if (useCache) {
      advancedCache.set(cacheKey, stats, {
        ttl: 5 * 60 * 1000, // 5 minutes
        dependencies: ['projects', 'transactions'],
        version: '1.0'
      });
    }

    return stats;
  }

  // Optimized client fetching with selective fields
  async getClients(
    userId: string,
    options: {
      useCache?: boolean;
      includeProjects?: boolean;
      limit?: number;
    } = {}
  ): Promise<Client[]> {
    const { useCache = true, includeProjects = false, limit } = options;
    const cacheKey = CacheKeys.clients(userId);

    if (useCache) {
      const cached = advancedCache.get<Client[]>(cacheKey);
      if (cached) return cached;
    }

    let query = supabase
      .from('clients')
      .select(`
        id, name, email, phone, whatsapp, instagram,
        client_type, status, created_at
        ${includeProjects ? ', projects(id, project_name, status, total_cost)' : ''}
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Map database fields to Client interface
    const clients = (data || []).map((item: any) => ({
      ...item,
      clientName: item.name
    }));

    if (useCache) {
      advancedCache.set(cacheKey, clients, {
        ttl: 5 * 60 * 1000, // 5 minutes
        dependencies: ['clients'],
        version: '1.0'
      });
    }

    return clients;
  }

  // Setup optimized real-time subscriptions
  setupRealtimeSubscriptions(userId: string) {
    // Projects subscription with batching
    const projectsSubscription = useOptimizedRealtime(
      {
        table: 'projects',
        filter: `user_id=eq.${userId}`,
        event: '*'
      },
      (payload) => {
        // Invalidate related caches
        const recordId = (payload.new as any)?.id || (payload.old as any)?.id;
        CacheInvalidation.onProjectUpdate(recordId, userId);
        
        // Emit custom event for components to react
        window.dispatchEvent(new CustomEvent('projectsUpdated', { 
          detail: payload 
        }));
      },
      {
        batchDelay: 1000, // 1 second batching
        maxBatchSize: 5,
        reconnectDelay: 2000,
        maxReconnectAttempts: 3
      }
    );

    // Clients subscription
    const clientsSubscription = useOptimizedRealtime(
      {
        table: 'clients',
        filter: `user_id=eq.${userId}`,
        event: '*'
      },
      (payload) => {
        const recordId = (payload.new as any)?.id || (payload.old as any)?.id;
        CacheInvalidation.onClientUpdate(recordId, userId);
        
        window.dispatchEvent(new CustomEvent('clientsUpdated', { 
          detail: payload 
        }));
      },
      {
        batchDelay: 2000, // 2 seconds for less frequent updates
        maxBatchSize: 3
      }
    );

    // Store subscriptions for cleanup
    this.realtimeConnections.set(`projects_${userId}`, projectsSubscription);
    this.realtimeConnections.set(`clients_${userId}`, clientsSubscription);
  }

  // Cleanup subscriptions
  cleanupRealtimeSubscriptions(userId: string) {
    const projectsSub = this.realtimeConnections.get(`projects_${userId}`);
    const clientsSub = this.realtimeConnections.get(`clients_${userId}`);

    if (projectsSub) {
      projectsSub.disconnect();
      this.realtimeConnections.delete(`projects_${userId}`);
    }

    if (clientsSub) {
      clientsSub.disconnect();
      this.realtimeConnections.delete(`clients_${userId}`);
    }
  }

  // Preload critical data
  async preloadCriticalData(userId: string) {
    const preloadPromises = [
      // Preload recent projects
      this.getProjects(userId, { 
        limit: 10, 
        useCache: true,
        filters: { 
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() 
        }
      }),
      
      // Preload dashboard stats
      this.getDashboardStats(userId, true),
      
      // Preload active clients
      this.getClients(userId, { 
        useCache: true, 
        limit: 20 
      })
    ];

    try {
      await Promise.all(preloadPromises);
      console.log('Critical data preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload some critical data:', error);
    }
  }

  // Get cache statistics
  getCacheStats() {
    return advancedCache.getStats();
  }

  // Clear all caches
  clearAllCaches() {
    advancedCache.clear();
  }
}

export const optimizedDataService = OptimizedDataService.getInstance();