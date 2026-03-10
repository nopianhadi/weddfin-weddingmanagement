/**
 * React Hook untuk Offline Sync
 * Menyediakan interface mudah untuk menggunakan offline storage dan sync
 */

import { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncEvent } from '../services/syncManager';
import { offlineStorage } from '../services/offlineStorage';

export interface OfflineSyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSync: number | null;
  syncMessage: string;
  syncProgress: number;
  syncTotal: number;
  failedCount: number;
}

export function useOfflineSync() {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingCount: 0,
    lastSync: null,
    syncMessage: '',
    syncProgress: 0,
    syncTotal: 0,
    failedCount: 0,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      // Auto-sync when coming back online
      syncManager.sync().catch(console.error);
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to sync events
  useEffect(() => {
    const unsubscribe = syncManager.on((event: SyncEvent) => {
      switch (event.type) {
        case 'sync-start':
          setState(prev => ({
            ...prev,
            isSyncing: true,
            syncMessage: event.message,
            syncProgress: 0,
            syncTotal: 0,
          }));
          break;

        case 'sync-progress':
          setState(prev => ({
            ...prev,
            syncMessage: event.message,
            syncProgress: event.progress || 0,
            syncTotal: event.total || 0,
          }));
          break;

        case 'sync-complete':
          setState(prev => ({
            ...prev,
            isSyncing: false,
            syncMessage: event.message,
            lastSync: Date.now(),
          }));
          updatePendingCount();
          break;

        case 'sync-error':
          setState(prev => ({
            ...prev,
            isSyncing: false,
            syncMessage: event.message,
          }));
          break;
      }
    });

    return unsubscribe;
  }, []);

  // Update pending count periodically
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await syncManager.getPendingCount();
      const lastSync = await syncManager.getLastSyncTime();
      const failedOps = await offlineStorage.getFailedOperations();
      setState(prev => ({
        ...prev,
        pendingCount: count,
        lastSync: lastSync || null,
        failedCount: failedOps.length,
      }));
    } catch (error) {
      console.error('[useOfflineSync] Failed to update pending count:', error);
    }
  }, []);

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, [updatePendingCount]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    try {
      await syncManager.sync();
    } catch (error) {
      console.error('[useOfflineSync] Manual sync failed:', error);
      throw error;
    }
  }, []);

  // Queue operations
  const queueInsert = useCallback(async (table: string, data: any) => {
    return syncManager.queueInsert(table, data);
  }, []);

  const queueUpdate = useCallback(async (table: string, data: any) => {
    return syncManager.queueUpdate(table, data);
  }, []);

  const queueDelete = useCallback(async (table: string, id: string) => {
    return syncManager.queueDelete(table, id);
  }, []);

  // Cache operations
  const cacheData = useCallback(async (key: string, data: any, ttlMinutes?: number) => {
    return offlineStorage.cacheData(key, data, ttlMinutes);
  }, []);

  const getCachedData = useCallback(async <T = any>(key: string): Promise<T | null> => {
    return offlineStorage.getCachedData<T>(key);
  }, []);

  return {
    ...state,
    triggerSync,
    queueInsert,
    queueUpdate,
    queueDelete,
    cacheData,
    getCachedData,
  };
}
