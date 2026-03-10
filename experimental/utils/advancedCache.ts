interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  dependencies?: string[];
}

interface CacheConfig {
  defaultTTL?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in memory cache
  persistToStorage?: boolean; // Whether to persist to localStorage
  compressionThreshold?: number; // Compress data larger than this size
}

class AdvancedCache {
  private memoryCache = new Map<string, CacheItem<any>>();
  private config: Required<CacheConfig>;
  private accessOrder: string[] = []; // For LRU eviction

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxSize: config.maxSize || 100,
      persistToStorage: config.persistToStorage ?? true,
      compressionThreshold: config.compressionThreshold || 10000 // 10KB
    };

    // Load persisted cache on initialization
    if (this.config.persistToStorage) {
      this.loadFromStorage();
    }
  }

  set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number;
      version?: string;
      dependencies?: string[];
      tags?: string[];
    } = {}
  ): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.config.defaultTTL,
      version: options.version || '1.0',
      dependencies: options.dependencies
    };

    // Add to memory cache
    this.memoryCache.set(key, item);
    this.updateAccessOrder(key);

    // Persist to localStorage if enabled
    if (this.config.persistToStorage) {
      this.persistToStorage(key, item);
    }

    // Enforce size limit
    this.enforceMaxSize();
  }

  get<T>(key: string, version?: string): T | null {
    // Check memory cache first
    let item = this.memoryCache.get(key);

    // If not in memory, try localStorage
    if (!item && this.config.persistToStorage) {
      item = this.loadFromStorage(key);
      if (item) {
        this.memoryCache.set(key, item);
      }
    }

    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return null;
    }

    // Check version compatibility
    if (version && item.version !== version) {
      this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    return item.data;
  }

  delete(key: string): void {
    this.memoryCache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    
    if (this.config.persistToStorage) {
      localStorage.removeItem(`cache_${key}`);
    }
  }

  invalidateByDependency(dependency: string): void {
    const keysToInvalidate: string[] = [];
    
    this.memoryCache.forEach((item, key) => {
      if (item.dependencies?.includes(dependency)) {
        keysToInvalidate.push(key);
      }
    });

    keysToInvalidate.forEach(key => this.delete(key));
  }

  invalidateByPattern(pattern: RegExp): void {
    const keysToInvalidate: string[] = [];
    
    this.memoryCache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToInvalidate.push(key);
      }
    });

    keysToInvalidate.forEach(key => this.delete(key));
  }

  clear(): void {
    this.memoryCache.clear();
    this.accessOrder = [];
    
    if (this.config.persistToStorage) {
      // Clear all cache items from localStorage
      const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
      keys.forEach(key => localStorage.removeItem(key));
    }
  }

  getStats() {
    return {
      memorySize: this.memoryCache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      oldestItem: this.getOldestItemAge(),
      storageUsage: this.getStorageUsage()
    };
  }

  // Preload data based on usage patterns
  async preload<T>(
    key: string,
    loader: () => Promise<T>,
    options: {
      ttl?: number;
      version?: string;
      dependencies?: string[];
      condition?: () => boolean;
    } = {}
  ): Promise<T> {
    // Check if we should preload
    if (options.condition && !options.condition()) {
      return loader();
    }

    // Check if already cached
    const cached = this.get<T>(key, options.version);
    if (cached) return cached;

    // Load and cache
    const data = await loader();
    this.set(key, data, options);
    return data;
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private enforceMaxSize(): void {
    while (this.memoryCache.size > this.config.maxSize) {
      // Remove least recently used item
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.memoryCache.delete(lruKey);
      }
    }
  }

  private persistToStorage<T>(key: string, item: CacheItem<T>): void {
    try {
      const serialized = JSON.stringify(item);
      
      // Compress if data is large
      if (serialized.length > this.config.compressionThreshold) {
        // Simple compression - in production, use a proper compression library
        localStorage.setItem(`cache_${key}`, this.compress(serialized));
      } else {
        localStorage.setItem(`cache_${key}`, serialized);
      }
    } catch (error) {
      console.warn('Failed to persist cache item:', error);
    }
  }

  private loadFromStorage(key?: string): CacheItem<any> | null {
    if (key) {
      try {
        const stored = localStorage.getItem(`cache_${key}`);
        if (stored) {
          const decompressed = this.decompress(stored);
          return JSON.parse(decompressed);
        }
      } catch (error) {
        console.warn('Failed to load cache item:', error);
        localStorage.removeItem(`cache_${key}`);
      }
      return null;
    }

    // Load all cache items
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
      keys.forEach(storageKey => {
        const key = storageKey.replace('cache_', '');
        const item = this.loadFromStorage(key);
        if (item) {
          this.memoryCache.set(key, item);
          this.accessOrder.push(key);
        }
      });
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private compress(data: string): string {
    // Simple compression - replace with proper compression in production
    return btoa(data);
  }

  private decompress(data: string): string {
    try {
      return atob(data);
    } catch {
      // If decompression fails, assume it's uncompressed
      return data;
    }
  }

  private calculateHitRate(): number {
    // This would need to be tracked over time in a real implementation
    return 0.85; // Placeholder
  }

  private getOldestItemAge(): number {
    let oldest = 0;
    this.memoryCache.forEach(item => {
      const age = Date.now() - item.timestamp;
      if (age > oldest) oldest = age;
    });
    return oldest;
  }

  private getStorageUsage(): number {
    if (!this.config.persistToStorage) return 0;
    
    let totalSize = 0;
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache_'));
    keys.forEach(key => {
      totalSize += localStorage.getItem(key)?.length || 0;
    });
    return totalSize;
  }
}

// Global cache instance
export const advancedCache = new AdvancedCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 200,
  persistToStorage: true,
  compressionThreshold: 5000 // 5KB
});

// Cache key generators
export const CacheKeys = {
  projects: (userId: string, filters?: any) => 
    `projects_${userId}_${filters ? JSON.stringify(filters) : 'all'}`,
  
  clients: (userId: string) => `clients_${userId}`,
  
  dashboardStats: (userId: string) => `dashboard_stats_${userId}`,
  
  projectAnalytics: (userId: string, timeframe: string, projectType?: string) =>
    `analytics_${userId}_${timeframe}_${projectType || 'all'}`,
  
  transactions: (userId: string, dateRange?: string) =>
    `transactions_${userId}_${dateRange || 'all'}`,
  
  teamMembers: (userId: string) => `team_members_${userId}`
};

// Cache invalidation helpers
export const CacheInvalidation = {
  onProjectUpdate: (projectId: string, userId: string) => {
    advancedCache.invalidateByPattern(/^projects_/);
    advancedCache.invalidateByPattern(/^dashboard_stats_/);
    advancedCache.invalidateByPattern(/^analytics_/);
  },
  
  onClientUpdate: (clientId: string, userId: string) => {
    advancedCache.invalidateByPattern(/^clients_/);
    advancedCache.invalidateByPattern(/^projects_/);
  },
  
  onTransactionUpdate: (userId: string) => {
    advancedCache.invalidateByPattern(/^transactions_/);
    advancedCache.invalidateByPattern(/^dashboard_stats_/);
  }
};