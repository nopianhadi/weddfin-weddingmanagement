// Script untuk monitoring penggunaan egress
import supabase from '../lib/supabaseClient';

interface EgressMetrics {
  timestamp: string;
  operation: string;
  estimatedSize: number; // in bytes
  recordCount: number;
  duration: number; // in ms
}

class EgressMonitor {
  private metrics: EgressMetrics[] = [];
  private isEnabled = process.env.NODE_ENV === 'development';

  // Wrap Supabase query untuk monitoring
  async monitorQuery<T>(
    operation: string,
    queryFn: () => Promise<{ data: T; error: any }>,
    estimateSize?: (data: T) => number
  ): Promise<{ data: T; error: any }> {
    if (!this.isEnabled) {
      return await queryFn();
    }

    const startTime = Date.now();
    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (result.data && !result.error) {
      const recordCount = Array.isArray(result.data) ? result.data.length : 1;
      const estimatedSize = estimateSize 
        ? estimateSize(result.data)
        : this.estimateDataSize(result.data);

      this.addMetric({
        timestamp: new Date().toISOString(),
        operation,
        estimatedSize,
        recordCount,
        duration
      });
    }

    return result;
  }

  private addMetric(metric: EgressMetrics) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log significant queries
    if (metric.estimatedSize > 100000) { // > 100KB
      console.warn(`Large query detected: ${metric.operation}`, {
        size: `${(metric.estimatedSize / 1024).toFixed(2)}KB`,
        records: metric.recordCount,
        duration: `${metric.duration}ms`
      });
    }
  }

  private estimateDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      if (Array.isArray(data)) {
        return data.length * 2000; // Assume 2KB per record
      }
      return 1000; // 1KB for single record
    }
  }

  // Get metrics summary
  getSummary() {
    const totalSize = this.metrics.reduce((sum, m) => sum + m.estimatedSize, 0);
    const totalRecords = this.metrics.reduce((sum, m) => sum + m.recordCount, 0);
    const avgDuration = this.metrics.length > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length
      : 0;

    return {
      totalQueries: this.metrics.length,
      totalSize: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      totalRecords,
      avgDuration: avgDuration.toFixed(2),
      largestQuery: this.metrics.reduce((max, m) => 
        m.estimatedSize > max.estimatedSize ? m : max, 
        { estimatedSize: 0, operation: 'none' }
      )
    };
  }

  // Get detailed metrics
  getMetrics() {
    return [...this.metrics];
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Export metrics to console
  logSummary() {
    const summary = this.getSummary();
    console.group('📊 Egress Monitor Summary');
    console.log(`Total Queries: ${summary.totalQueries}`);
    console.log(`Total Data: ${summary.totalSizeKB}KB`);
    console.log(`Total Records: ${summary.totalRecords}`);
    console.log(`Avg Duration: ${summary.avgDuration}ms`);
    console.log(`Largest Query: ${summary.largestQuery.operation} (${(summary.largestQuery.estimatedSize / 1024).toFixed(2)}KB)`);
    console.groupEnd();
  }
}

// Global instance
export const egressMonitor = new EgressMonitor();

// Helper functions untuk monitoring specific operations
export const monitoredQueries = {
  async listProjects(options: { limit?: number; offset?: number } = {}) {
    return egressMonitor.monitorQuery(
      `listProjects(limit: ${options.limit || 'all'})`,
      async () => {
        return await supabase.from('projects').select('*').range(
          options.offset || 0, 
          (options.offset || 0) + (options.limit || 1000) - 1
        );
      },
      (data) => Array.isArray(data) ? data.length * 2000 : 2000 // 2KB per project
    );
  },

  async listClients(options: { limit?: number; offset?: number } = {}) {
    return egressMonitor.monitorQuery(
      `listClients(limit: ${options.limit || 'all'})`,
      async () => {
        return await supabase.from('clients').select('*').range(
          options.offset || 0,
          (options.offset || 0) + (options.limit || 1000) - 1
        );
      },
      (data) => Array.isArray(data) ? data.length * 1000 : 1000 // 1KB per client
    );
  },

  async getDashboardStats() {
    return egressMonitor.monitorQuery(
      'getDashboardStats',
      async () => {
        const [projectsCount, clientsCount] = await Promise.all([
          supabase.from('projects').select('*', { count: 'exact', head: true }),
          supabase.from('clients').select('*', { count: 'exact', head: true })
        ]);
        return { 
          data: { 
            projects: projectsCount.count, 
            clients: clientsCount.count 
          }, 
          error: null 
        };
      },
      () => 100 // Small stats query
    );
  }
};

// Development helper
if (typeof window !== 'undefined') {
  (window as any).egressMonitor = egressMonitor;
  (window as any).logEgressSummary = () => egressMonitor.logSummary();
}